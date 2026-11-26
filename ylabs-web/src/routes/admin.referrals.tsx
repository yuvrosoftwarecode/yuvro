import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import {
  referralService,
  type AdminReferralSummary,
  type AdminReferrerItem,
  type AdminReferrerDetails,
} from "@/services/referralService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  CheckCircle2,
  Clock,
  Gift,
  Search,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferralsPage,
});

function AdminReferralsPage() {
  const [summary, setSummary] = useState<AdminReferralSummary | null>(null);
  const [referrers, setReferrers] = useState<AdminReferrerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View Details Modal State
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<AdminReferrerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate Referral Code Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [targetStudentEmail, setTargetStudentEmail] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState<any | null>(null);
  const [generateModalError, setGenerateModalError] = useState<string | null>(null);

  // Load KPI summary once
  useEffect(() => {
    referralService
      .getAdminSummary()
      .then((data) => setSummary(data))
      .catch((err) => console.error("Failed to load admin referral summary:", err));
  }, []);

  // Load referring students table
  useEffect(() => {
    let isCancelled = false;
    setTableLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      referralService
        .getAdminStudents(page, pageSize, search, statusFilter)
        .then((res) => {
          if (!isCancelled) {
            setReferrers(res.results || []);
            setTotalCount(res.count || 0);
            setTotalPages(res.total_pages || 1);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error("Failed to fetch admin referral list:", err);
            setError("Failed to load referral records. Please try again.");
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLoading(false);
            setTableLoading(false);
          }
        });
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [page, pageSize, search, statusFilter]);

  // Open Details Modal
  const handleOpenDetails = (userId: string) => {
    setSelectedReferrerId(userId);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsData(null);

    referralService
      .getAdminStudentDetails(userId)
      .then((data) => {
        setDetailsData(data);
      })
      .catch((err) => {
        console.error("Failed to load referrer details:", err);
        setDetailsError("Failed to load detailed referral records for this student.");
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAdminGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentEmail.trim()) return;
    setGenerateLoading(true);
    setGenerateModalError(null);
    setGenerateResult(null);

    try {
      const res = await referralService.adminGenerateReferralCode({
        email: targetStudentEmail.trim(),
      });
      setGenerateResult(res);
      // Reload stats and referrers
      referralService.getAdminSummary().then((s) => setSummary(s)).catch(() => {});
      referralService.getAdminStudents(page, pageSize, search, statusFilter).then((r) => {
        setReferrers(r.results || []);
        setTotalCount(r.count || 0);
        setTotalPages(r.total_pages || 1);
      }).catch(() => {});
    } catch (err: any) {
      console.error("Admin code generation failed:", err);
      setGenerateModalError(
        err?.response?.data?.detail || "Failed to generate referral code. Please verify the student email."
      );
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <AdminShell
      title="Referral Management"
      breadcrumb={["People", "Referrals"]}
      right={
        <div className="flex items-center gap-2.5">
          <Badge tone="primary">Centralized YHub Data</Badge>
          <button
            type="button"
            onClick={() => {
              setGenerateModalOpen(true);
              setGenerateResult(null);
              setGenerateModalError(null);
              setTargetStudentEmail("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Referral Code</span>
          </button>
        </div>
      }
    >
      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total Referrals"
          value={loading || !summary ? "-" : summary.total_referrals}
          color="primary"
          icon={Gift}
        />
        <KpiCard
          label="Total Accepted Referrals"
          value={loading || !summary ? "-" : summary.total_accepted}
          color="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Total Pending Referrals"
          value={loading || !summary ? "-" : summary.total_pending}
          color="warning"
          icon={Clock}
        />
        <KpiCard
          label="Students Who Referred"
          value={loading || !summary ? "-" : summary.total_referring_students}
          color="ui"
          icon={Users}
        />
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        {/* Search & Filter Header */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/60">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs w-72">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name or referral code"
              className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <span className="ml-auto text-xs text-muted-foreground">
            Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(page * pageSize, totalCount)} of {totalCount} referring students
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20 border-b border-border/60">
              <tr>
                <th className="px-4 py-3 text-left">Referring Student Name</th>
                <th className="px-4 py-3 text-left">Referral Code</th>
                <th className="px-4 py-3 text-center">Total Referred</th>
                <th className="px-4 py-3 text-center">Accepted</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tableLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary mb-2" />
                    Loading referral data...
                  </td>
                </tr>
              ) : referrers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    No referring students found matching your criteria.
                  </td>
                </tr>
              ) : (
                referrers.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.referral_code ? (
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded border border-border bg-background/50">
                          <span>{r.referral_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(r.referral_code)}
                            title="Copy code"
                            className="hover:text-primary transition"
                          >
                            {copiedCode === r.referral_code ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStudentEmail(r.email);
                            setGenerateModalOpen(true);
                            setGenerateResult(null);
                            setGenerateModalError(null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Generate Code</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">
                      {r.total_referred}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {r.accepted}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {r.pending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-accent text-foreground transition shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>View Referral</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              View Referral
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Individual referrals and account registrations for this student.
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              Loading referral details...
            </div>
          ) : detailsError ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 text-center">
              {detailsError}
            </div>
          ) : detailsData ? (
            <div className="space-y-4">
              {/* Referrer summary card */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-accent/30 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Referring Student
                  </span>
                  <div className="font-semibold text-foreground mt-0.5 truncate">
                    {detailsData.referrer_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {detailsData.referrer_email}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Referral Code
                  </span>
                  <div className="font-mono font-bold text-primary mt-0.5">
                    {detailsData.referral_code}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Total Referred
                  </span>
                  <div className="font-bold text-foreground mt-0.5">
                    {detailsData.referrals.length} friends
                  </div>
                </div>
              </div>

              {/* Referred students table */}
              <div className="rounded-lg border border-border/80 overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 uppercase tracking-wide text-muted-foreground sticky top-0 border-b border-border/60">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Referred Student Name</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Email</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Registration Date</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {detailsData.referrals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No referrals recorded for this student yet.
                        </td>
                      </tr>
                    ) : (
                      detailsData.referrals.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="px-3.5 py-2.5 font-medium text-foreground">
                            {item.referred_name}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground font-mono">
                            {item.referred_email || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {item.registration_date
                              ? new Date(item.registration_date).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {item.status.toLowerCase() === "accepted" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Accepted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Generate Referral Code Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Generate Referral Code
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate a unique referral code for a student using their registered email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminGenerateCode} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Student Email
              </label>
              <input
                type="email"
                required
                value={targetStudentEmail}
                onChange={(e) => setTargetStudentEmail(e.target.value)}
                placeholder="e.g. student@gmail.com"
                className="w-full text-xs px-3 py-2 rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {generateModalError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{generateModalError}</span>
              </div>
            )}

            {generateResult && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Referral Code Generated Successfully!</span>
                </div>
                <div className="pt-1">
                  <span className="text-muted-foreground">Student: </span>
                  <span className="font-medium text-foreground">{generateResult.name} ({generateResult.email})</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-muted-foreground">Code: </span>
                  <span className="font-mono font-bold text-primary text-sm">{generateResult.code}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(generateResult.code)}
                    className="p-1 hover:text-primary transition"
                  >
                    {copiedCode === generateResult.code ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent text-foreground transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={generateLoading || !targetStudentEmail.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {generateLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
