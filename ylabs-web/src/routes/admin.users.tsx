import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Users, UserPlus, Download, Filter, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const ROLES = ["Student", "Job Seeker", "Recruiter", "Mentor", "Admin"];
const COLLEGES = ["IIT Bombay", "BITS Pilani", "VIT", "NIT Trichy", "Anna Univ", "—"];

const USERS = Array.from({ length: 40 }, (_, i) => ({
  id: `u_${1000 + i}`,
  name: ["Priya Sharma","Marcus Kim","Sana Ahmed","Lina Park","Rohith S.","Aarav P.","Mei Chen","Diego R.","Yuki T.","Noah L."][i % 10] + (i > 9 ? ` ${i}` : ""),
  email: `user${i + 1}@yuvrolabs.com`,
  role: ROLES[i % ROLES.length],
  college: COLLEGES[i % COLLEGES.length],
  skill: 60 + ((i * 7) % 40),
  collab: 50 + ((i * 11) % 50),
  reliability: 70 + ((i * 3) % 30),
  active: ["2m", "8m", "21m", "1h", "3h", "1d", "2d"][i % 7] + " ago",
  status: i % 9 === 0 ? "suspended" : i % 5 === 0 ? "invited" : "active",
}));

function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const filtered = USERS.filter(u =>
    (role === "All" || u.role === role) &&
    (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AdminShell title="Users" breadcrumb={["People", "Users"]} right={
      <div className="flex items-center gap-2">
        <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</button>
        <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Invite users</button>
      </div>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total users" value="1,284,991" delta="+12.4% MoM" color="primary" icon={Users} />
        <KpiCard label="Active (24h)" value="48,127" delta="+3.2%" color="success" />
        <KpiCard label="New signups" value="2,418" delta="last 24h" color="ui" />
        <KpiCard label="Suspended" value="62" delta="-4 this week" color="warning" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border/60">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs w-72">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="bg-transparent outline-none flex-1" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5">
            <option>All</option>{ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> More filters</button>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length.toLocaleString()} of {USERS.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>
                {["Name","Email","Role","College","Skill","Collab","Reliability","Last active","Status",""].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary text-[11px] font-semibold">{u.name[0]}</div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5"><Badge tone={u.role === "Admin" ? "destructive" : u.role === "Recruiter" ? "ui" : "muted"}>{u.role}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.college}</td>
                  <td className="px-4 py-2.5 font-mono">{u.skill}</td>
                  <td className="px-4 py-2.5 font-mono">{u.collab}</td>
                  <td className="px-4 py-2.5 font-mono">{u.reliability}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.active}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.status === "active" ? "success" : u.status === "invited" ? "primary" : "destructive"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link to="/admin/users/$id" params={{ id: u.id }} className="text-xs text-primary hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 text-xs text-muted-foreground border-t border-border/60">
          <span>Page 1 of 25,699</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded border border-border hover:bg-accent">Prev</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-accent">Next</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
