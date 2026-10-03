import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge } from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/admin/labs/$id/analytics")({ component: LabAnalytics });

function LabAnalytics() {
  const { id } = Route.useParams();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setLoading(true);
    restApiAuthUtil.get<any>("/lab/enrollments/?lab_id=" + id)
      .then(data => {
        if (active) {
          setEnrollments(data?.results ?? data ?? []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error("Analytics fetch error:", err);
          setError("Failed to load enrolled students. The backend may have returned an error — please check the server console.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [id]);

  return (
    <AdminShell
      title="Lab Analytics"
      breadcrumb={["Labs", "Analytics"]}
      right={
        <Link to="/admin/labs/" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">
          &larr; Back
        </Link>
      }
    >
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading enrolled students...</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No students are currently enrolled in this lab.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20 border-b border-border/60">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enr) => {
                const u = enr.user_details;
                const l = enr.lab_details;
                if (!u || !l) return null;
                return (
                  <tr key={enr.id} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === 'active' ? 'success' : 'destructive'}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/student-report/$userId/$labId"
                        params={{ userId: String(u.id), labId: l.id }}
                        className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-block"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
