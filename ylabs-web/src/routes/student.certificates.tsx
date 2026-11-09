import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { certificates, me } from "@/lib/dummy";
import { Award, Download, Share2, Linkedin } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ShareMilestoneModal } from "@/components/shared/ShareMilestoneModal";

export const Route = createFileRoute("/student/certificates")({
  component: Certificates,
});

function Certificates() {
  const { user } = useAuth();
  const [selectedCertificate, setSelectedCertificate] = useState<{ title: string; id: string } | null>(null);
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Award className="h-6 w-6 text-warning" />
            Certificates & Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Shareable, verified records of your completed labs.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card overflow-hidden">
              <div
                className="relative p-6"
                style={{
                  background: `linear-gradient(135deg, color-mix(in oklab, var(--${c.color}) 30%, transparent), transparent)`,
                }}
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Practical Labs · Certificate
                </div>
                <h3 className="mt-2 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Awarded to{" "}
                  <span className="text-foreground font-medium">
                    {user
                      ? user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : user.username
                      : "Student"}
                  </span>
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.date}</span>
                  <span
                    className="rounded-md border px-2 py-0.5"
                    style={{
                      color: `var(--${c.color})`,
                      borderColor: `color-mix(in oklab, var(--${c.color}) 40%, transparent)`,
                    }}
                  >
                    Score {c.score}
                  </span>
                </div>
                <Award
                  className="absolute right-4 top-4 h-10 w-10 opacity-30"
                  style={{ color: `var(--${c.color})` }}
                />
              </div>
              <div className="flex gap-2 border-t p-3">
                <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border py-1.5 text-xs hover:bg-accent">
                  <Download className="h-3 w-3" />
                  PDF
                </button>
                <button
                  onClick={() => setSelectedCertificate({ title: c.title, id: c.id })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5 fill-current" />
                  Share to LinkedIn
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedCertificate && (
        <ShareMilestoneModal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          milestoneTitle={selectedCertificate.title}
          milestoneType="certificate"
          shareUrl={typeof window !== "undefined" ? `${window.location.origin}/student/certificates` : undefined}
          defaultCommentary={`🎓 Delighted to share that I've earned the ${selectedCertificate.title} certification on Yuvro Labs! Always leveling up. #learning #growth #developer #yuvro`}
        />
      )}
    </div>
  );
}
