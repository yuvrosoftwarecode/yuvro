import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Interview } from "@/lib/mockInterviews";
import {
  fetchBackendMockInterviews,
  fetchUserInterviewSubmissions,
  fetchMockInterviewQuota,
  type CandidateMockInterviewQuota,
} from "@/services/mockInterviewService";
import { BuyMockInterviewsModal } from "@/components/interview/BuyMockInterviewsModal";

export const Route = createFileRoute("/mock-interviews")({
  head: () => ({
    meta: [
      { title: "Mock Interviews | Yuvro" },
      { name: "description", content: "Practice AI-led tech mock interviews with Vitarka." },
    ],
  }),
  component: MockHub,
});

function MockHub() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [quota, setQuota] = useState<CandidateMockInterviewQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyModalNote, setBuyModalNote] = useState<string | null>(null);

  useEffect(() => {
    // Purge any stale legacy dummy data or cached enrolled slugs from localStorage
    try {
      localStorage.removeItem("yuvro-mock-interviews-enrolled");
      localStorage.removeItem("yuvro_real_mock_interviews_enrolled");
    } catch {}

    let cancelled = false;
    Promise.all([
      fetchBackendMockInterviews("ylabs"),
      fetchUserInterviewSubmissions("ylabs"),
      fetchMockInterviewQuota(),
    ])
      .then(([backendData, userSubmissions, userQuota]) => {
        if (cancelled) return;
        if (backendData && Array.isArray(backendData)) {
          setInterviews(backendData);
        } else {
          setInterviews([]);
        }
        if (userSubmissions && Array.isArray(userSubmissions)) {
          setSubmissions(userSubmissions);
        }
        if (userQuota) {
          setQuota(userQuota);
        }
      })
      .catch((err) => {
        console.error("Failed to load mock interview data:", err);
        if (!cancelled) {
          setInterviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const availableCount = quota ? quota.available_interviews : 0;

  const handleRequireBuy = () => {
    setBuyModalNote("You have 0 mock interviews remaining. Please choose a pack to start your interview.");
    setIsBuyModalOpen(true);
  };

  const countText =
    interviews.length === 1 ? "1 interview" : `${interviews.length} interviews`;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">My interviews</h2>
              {isLoading ? (
                <Skeleton className="mt-1 h-3.5 w-16" />
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">{countText}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Available mock interview:</span>
                {isLoading || quota === null ? (
                  <Skeleton className="h-4 w-6 rounded" />
                ) : (
                  <span className="font-medium text-foreground">{availableCount}</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setBuyModalNote(null);
                  setIsBuyModalOpen(true);
                }}
              >
                Buy
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="flex min-w-0 flex-col rounded-lg bg-card p-6 border border-border/40"
                >
                  <Skeleton className="mb-3 h-3 w-20" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-4/5 mb-4" />
                  <Skeleton className="mb-6 mt-4 h-3 w-20" />
                  <div className="mt-auto flex gap-3">
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
              You haven't added any mock interview yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {interviews.map((i) => (
                <MineCard
                  key={i.slug}
                  i={i}
                  isCompleted={checkCompleted(i, submissions)}
                  availableInterviews={availableCount}
                  onRequireBuy={handleRequireBuy}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BuyMockInterviewsModal
        open={isBuyModalOpen}
        onOpenChange={setIsBuyModalOpen}
        quota={quota}
        initialNote={buyModalNote}
        onSuccess={(updated) => {
          setQuota(updated);
        }}
      />
    </div>
  );
}

function checkCompleted(i: Interview, submissions: any[]): boolean {
  if (i.completed && i.completed > 0) return true;
  if (i.userProgress && i.userProgress.completed_count > 0) return true;
  return submissions.some((s) => {
    const sId = String(s.mock_interview || s.mock_interview_id || "");
    const sTitle = String(s.mock_interview_title || "").toLowerCase().trim();
    const matchesId = sId === String(i.backendId) || sId === String(i.slug);
    const matchesTitle = sTitle && sTitle === i.name.toLowerCase().trim();
    return (matchesId || matchesTitle) && s.status === "completed";
  });
}

function MineCard({
  i,
  isCompleted,
  availableInterviews,
  onRequireBuy,
}: {
  i: Interview;
  isCompleted: boolean;
  availableInterviews: number;
  onRequireBuy: () => void;
}) {
  const completed = isCompleted;
  const isBlocked = availableInterviews <= 0;

  return (
    <article className="flex min-w-0 flex-col rounded-lg bg-card p-6">
      <p
        className={`mb-3 text-xs font-medium ${
          completed ? "text-brand-orange" : "text-muted-foreground"
        }`}
      >
        {completed ? "Completed" : "Ready to start"}
      </p>
      <h3 className="text-base font-medium">{i.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.description}</p>
      <p className="mb-6 mt-4 text-xs text-muted-foreground">{i.minutes} minutes</p>
      <div className="mt-auto flex flex-wrap gap-3">
        {completed && (
          <Button asChild size="sm">
            <Link
              to="/mock-interview/$slug"
              params={{ slug: i.slug }}
              search={{ report: true }}
            >
              View report
            </Link>
          </Button>
        )}
        {isBlocked ? (
          <Button
            size="sm"
            variant={completed ? "secondary" : "default"}
            onClick={onRequireBuy}
          >
            {completed ? "Retake" : "Start interview"}
          </Button>
        ) : (
          <Button asChild size="sm" variant={completed ? "secondary" : "default"}>
            <Link
              to="/mock-interview/$slug"
              params={{ slug: i.slug }}
              search={{ report: false }}
            >
              {completed ? "Retake" : "Start interview"}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
