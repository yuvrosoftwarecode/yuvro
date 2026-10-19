import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import {
  Plus,
  FlaskConical,
  Trash2,
  Pencil,
  CheckCircle2,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  loadLabs,
  deleteLab,
  LAB_TYPES,
  labTypeLabel,
  difficultyLabel,
  labStatusLabel,
  type AdminLab,
  type LabType,
  type LabStatus,
} from "@/lib/adminLabs";
import { LabIcon } from "@/components/LabIcon";

export const Route = createFileRoute("/admin/labs/")({ component: LabsPage });

function LabsPage() {
  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [type, setType] = useState<LabType | null>(null);
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadLabs();
      setLabs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, type]);

  const filtered = useMemo(() => {
    return labs.filter(
      (l) =>
        (!type || l.type === type) &&
        (!q ||
          l.title.toLowerCase().includes(q.toLowerCase()) ||
          l.description.toLowerCase().includes(q.toLowerCase())),
    );
  }, [labs, type, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedLabs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const remove = async (id: string) => {
    await deleteLab(id);
    setConfirmId(null);
    refresh();
  };

  const activeCount = labs.filter(
    (l) => (l.status || (l.is_active !== false ? "active" : "inactive")) === "active",
  ).length;
  const upcomingCount = labs.filter((l) => l.status === "upcoming").length;
  const totalSkills = labs.reduce((a, l) => a + (l.skills?.length || 0), 0);

  return (
    <AdminShell
      title="Labs"
      breadcrumb={["Engineering", "Labs"]}
      right={
        <Link
          to="/admin/labs/new"
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Create new lab
        </Link>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total labs" value={labs.length} color="primary" icon={FlaskConical} />
        <KpiCard label="Active labs" value={activeCount} color="success" icon={CheckCircle2} />
        <KpiCard label="Upcoming labs" value={upcomingCount} color="ui" />
        <KpiCard label="Skills catalogued" value={totalSkills} color="warning" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search labs..."
          className="text-xs px-3 py-1.5 rounded-md border border-border bg-transparent w-56"
        />
        <button
          onClick={() => setType(null)}
          className={`text-xs px-3 py-1.5 rounded-full border ${!type ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
        >
          All
        </button>
        {LAB_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full border ${type === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>
                {["Lab", "Type", "Difficulty", "Status", "Skills", "Actions"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    Loading labs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-xs">
                    No labs match your filters.{" "}
                    <Link to="/admin/labs/new" className="text-primary hover:underline">
                      Create one →
                    </Link>
                  </td>
                </tr>
              ) : (
                paginatedLabs.map((l) => (
                  <tr key={l.id} className="border-t border-border/40 hover:bg-accent/30 align-top">
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-2.5">
                        <LabIcon name={l.title} icon={l.icon} size="h-7 w-7" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span>{l.title}</span>
                            {l.custom && <Badge tone="success">new</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                            {l.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone="primary">{labTypeLabel(l.type)}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          l.difficulty === "hard"
                            ? "destructive"
                            : l.difficulty === "medium"
                              ? "warning"
                              : "success"
                        }
                      >
                        {difficultyLabel(l.difficulty)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          (l.status || (l.is_active === false ? "inactive" : "active")) === "active"
                            ? "success"
                            : (l.status || "") === "upcoming"
                              ? "primary"
                              : (l.status || "") === "draft"
                                ? "warning"
                                : "muted"
                        }
                      >
                        {labStatusLabel(l.status || (l.is_active === false ? "inactive" : "active"))}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {(l.skills || []).slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border/50 bg-muted/20"
                          >
                            {s}
                          </span>
                        ))}
                        {(l.skills || []).length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{(l.skills || []).length - 4}
                          </span>
                        )}
                        {!(l.skills || []).length && (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-3">
                        <Link
                          to="/admin/labs/$id/analytics"
                          params={{ id: l.id }}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <BarChart2 className="h-3 w-3" /> Analytics
                        </Link>
                        <Link
                          to="/admin/labs/$id/edit"
                          params={{ id: l.id }}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Link>
                        <button
                          onClick={() => setConfirmId(l.id)}
                          className="text-destructive hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs text-muted-foreground border-t border-border/60">
            <div className="flex items-center gap-3">
              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-medium text-foreground">{filtered.length}</span> labs
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none cursor-pointer"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded border border-border hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {totalPages <= 7
                  ? Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`h-7 w-7 rounded border text-xs font-medium cursor-pointer transition ${
                          page === item
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                      >
                        {item}
                      </button>
                    ))
                  : Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                      })
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        typeof item === "string" ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPage(item)}
                            className={`h-7 w-7 rounded border text-xs font-medium cursor-pointer transition ${
                              page === item
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:bg-accent text-foreground"
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded border border-border hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4"
          onClick={() => setConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-semibold text-sm">Delete this lab?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This removes it from the student catalog. You can re-create it later.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => remove(confirmId)}
                className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
