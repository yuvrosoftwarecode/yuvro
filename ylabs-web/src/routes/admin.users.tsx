import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Users, UserPlus, Download, Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const ROLES = ["Student", "Job Seeker", "Recruiter", "Mentor", "Admin"];

function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await restApiAuthUtil.get<any[]>("/auth/users/");
        const mappedUsers = response.map((u, i) => {
          let userRole = "Student";
          if (u.role === "admin") {
            userRole = "Admin";
          } else if (u.role === "developer") {
            userRole = "Mentor";
          } else if (u.role === "recruiter") {
            userRole = "Recruiter";
          } else if (u.role === "job_seeker" || u.role === "job seeker") {
            userRole = "Job Seeker";
          }

          return {
            id: u.id,
            name:
              u.first_name || u.last_name
                ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                : u.username || `User ${i}`,
            email: u.email,
            role: userRole,
            active: u.last_login ? new Date(u.last_login).toLocaleDateString() : "-",
            status: u.is_active ? "active" : "suspended",
          };
        });
        setUsers(mappedUsers);
      } catch (err) {
        console.error("Failed to fetch users from backend", err);
      }
    }
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      (role === "All" || u.role === role) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase())),
  );

  useEffect(() => {
    setPage(1);
  }, [q, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminShell
      title="Users"
      breadcrumb={["People", "Users"]}
      right={
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Invite users
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total users"
          value={users.length.toString()}
          delta="All time"
          color="primary"
          icon={Users}
        />
        <KpiCard 
          label="Active" 
          value={users.filter(u => u.status === 'active').length.toString()} 
          color="success" 
        />
        <KpiCard 
          label="Admins" 
          value={users.filter(u => u.role === 'Admin').length.toString()} 
          color="ui" 
        />
        <KpiCard 
          label="Suspended" 
          value={users.filter(u => u.status === 'suspended').length.toString()} 
          color="warning" 
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border/60">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs w-72">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="bg-transparent outline-none flex-1"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5"
          >
            <option>All</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> More filters
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} of {users.length} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>
                {["Name", "Email", "Role", "Last active", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary text-[11px] font-semibold">
                        {u.name[0]}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        u.role === "Admin" ? "destructive" : u.role === "Recruiter" ? "ui" : "muted"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.active}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        u.status === "active"
                          ? "success"
                          : u.status === "invited"
                            ? "primary"
                            : "destructive"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to="/admin/users/$id"
                      params={{ id: u.id }}
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 text-xs text-muted-foreground border-t border-border/60">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
