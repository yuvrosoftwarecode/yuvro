import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import {
  Plus,
  Bot,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  Users,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  adminFetchMockInterviews,
  deleteMockInterview,
  type BackendMockInterview,
} from "@/services/mockInterviewService";

export const Route = createFileRoute("/admin/mock-interviews/")({
  component: AdminMockInterviewsPage,
});

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const PRODUCT_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "ylabs", label: "YLabs" },
  { value: "ycode", label: "YCode" },
  { value: "ycampus", label: "YCampus" },
];

function AdminMockInterviewsPage() {
  const [interviews, setInterviews] = useState<BackendMockInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchMockInterviews();
      setInterviews(data);
    } catch (err: any) {
      console.error("Failed to load mock interviews:", err);
      setError(err?.message || "Failed to load mock interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, productFilter, statusFilter]);

  const filtered = useMemo(() => {
    return interviews.filter((item) => {
      // Search query
      if (q) {
        const query = q.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesSkills = (item.required_skills || []).some((s) =>
          s.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDesc && !matchesSkills) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (item.publish_status !== statusFilter) return false;
      }

      // Product filter
      if (productFilter !== "all") {
        const itemProducts = Array.isArray(item.products)
          ? item.products.map((p) => String(p).toLowerCase().trim())
          : [];
        if (!itemProducts.includes(productFilter.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [interviews, q, productFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedInterviews = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteMockInterview(id);
      setConfirmDeleteId(null);
      await loadData();
    } catch (err: any) {
      console.error("Failed to delete mock interview:", err);
      alert(err?.message || "Failed to delete mock interview.");
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = interviews.filter((i) => i.publish_status === "active").length;
  const draftCount = interviews.filter((i) => i.publish_status === "draft").length;
  const totalParticipants = interviews.reduce((acc, i) => acc + (i.participants_count || 0), 0);

  return (
    <AdminShell
      title="Mock Interviews"
      breadcrumb={["Developer", "Mock Interviews"]}
      right={
        <Link
          to="/admin/mock-interviews/new"
          className="text-xs px-3.5 py-2 rounded-lg bg-[#f7931e] text-white hover:bg-[#e07d0d] font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Create Mock Interview
        </Link>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Interviews" value={interviews.length} color="primary" icon={Bot} />
        <KpiCard label="Active Interviews" value={activeCount} color="success" icon={CheckCircle2} />
        <KpiCard label="Draft Interviews" value={draftCount} color="warning" icon={Clock} />
        <KpiCard label="Total Candidates" value={totalParticipants} color="ui" icon={Users} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border/60 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, skills, description..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-neutral-50/50 focus:bg-white text-neutral-700"
          >
            {PRODUCT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-neutral-50/50 focus:bg-white text-neutral-700"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Showing {filtered.length} of {interviews.length} interviews
        </div>
      </div>

      {/* Mock Interviews Table */}
      <div className="rounded-xl border border-border/60 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20 border-b border-border/40">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Interview</th>
                <th className="text-left font-medium px-4 py-2.5">Mode</th>
                <th className="text-left font-medium px-4 py-2.5">Duration</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-left font-medium px-4 py-2.5">Products</th>
                <th className="text-left font-medium px-4 py-2.5">Required Skills</th>
                <th className="text-center font-medium px-4 py-2.5">Participants</th>
                <th className="text-right font-medium px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    Loading mock interviews...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No mock interviews match your criteria.{" "}
                    <Link to="/admin/mock-interviews/new" className="text-primary font-medium hover:underline">
                      Create one now →
                    </Link>
                  </td>
                </tr>
              ) : (
                paginatedInterviews.map((item) => {
                  const statusTone =
                    item.publish_status === "active"
                      ? "success"
                      : item.publish_status === "draft"
                      ? "warning"
                      : "muted";

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-border/40 hover:bg-neutral-50/60 transition-colors align-middle"
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 max-w-[280px]">
                            <div className="font-semibold text-neutral-900 truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {item.description || "No description provided."}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700">
                          {item.interview_mode || "automatic"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-neutral-700">
                        {item.max_duration || 30} mins
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={statusTone}>{item.publish_status || "draft"}</Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.products || []).map((p) => (
                            <span
                              key={p}
                              className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {(item.required_skills || []).slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-neutral-50 text-neutral-600"
                            >
                              {s}
                            </span>
                          ))}
                          {(item.required_skills || []).length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{(item.required_skills || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-xs font-semibold text-neutral-800">
                        {item.participants_count || 0}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to="/mock-interview/$slug"
                            params={{ slug: item.id }}
                            target="_blank"
                            title="Preview Candidate Interview"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            to="/admin/mock-interviews/$id/edit"
                            params={{ id: item.id }}
                            title="Edit Interview"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            title="Delete Interview"
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground bg-neutral-50/50">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-border animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="font-semibold text-base text-neutral-900">Delete Mock Interview?</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-5 leading-relaxed">
              Are you sure you want to delete this mock interview? This action will permanently remove it along with all related predefined questions. Candidate test history may be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setConfirmDeleteId(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-neutral-100 text-neutral-700 font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => handleDelete(confirmDeleteId)}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
