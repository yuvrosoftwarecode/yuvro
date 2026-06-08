import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { certificates, me } from "@/lib/dummy";
import { Award, Download, Share2 } from "lucide-react";

export const Route = createFileRoute("/certificates")({ component: Certificates });

function Certificates() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Award className="h-6 w-6 text-warning" />Certificates & Portfolio</h1>
          <p className="text-sm text-muted-foreground">Shareable, verified records of your completed labs.</p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="relative p-6" style={{ background: `linear-gradient(135deg, color-mix(in oklab, var(--${c.color}) 30%, transparent), transparent)` }}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Practical Labs · Certificate</div>
                <h3 className="mt-2 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Awarded to <span className="text-foreground font-medium">{me.name}</span></p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.date}</span>
                  <span className="rounded-md border px-2 py-0.5" style={{ color: `var(--${c.color})`, borderColor: `color-mix(in oklab, var(--${c.color}) 40%, transparent)` }}>Score {c.score}</span>
                </div>
                <Award className="absolute right-4 top-4 h-10 w-10 opacity-30" style={{ color: `var(--${c.color})` }} />
              </div>
              <div className="flex gap-2 border-t p-3">
                <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border py-1.5 text-xs hover:bg-accent"><Download className="h-3 w-3" />PDF</button>
                <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border py-1.5 text-xs hover:bg-accent"><Share2 className="h-3 w-3" />Share</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
