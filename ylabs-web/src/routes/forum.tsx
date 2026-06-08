import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { forumThreads } from "@/lib/dummy";
import { MessagesSquare, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/forum")({ component: Forum });

function Forum() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><MessagesSquare className="h-6 w-6" />Discussion</h1>
            <p className="text-sm text-muted-foreground">Ask, answer, share patterns.</p>
          </div>
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4" />New thread</button>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search threads..." className="w-full rounded-md border bg-input/40 pl-8 pr-3 py-2 text-sm" />
          </div>
          {["All","Java","Python","UI","SQL","Help"].map((t, i) => (
            <button key={t} className={`rounded-md border px-3 py-2 text-xs ${i === 0 ? "bg-accent" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>

        <ul className="rounded-xl border bg-card divide-y">
          {forumThreads.map((t) => (
            <li key={t.id} className="p-4 hover:bg-accent/30 cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs">{t.author[0]}</span>
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.author} · {t.time} ago</div>
                </div>
                <span className="rounded-md border px-2 py-0.5 text-[11px]">{t.tag}</span>
                <span className="text-xs text-muted-foreground">{t.replies} replies</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
