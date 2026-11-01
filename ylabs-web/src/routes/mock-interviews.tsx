import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { hasCompletedInterview } from "@/lib/mockInterviewReports";
import { INTERVIEWS, type Interview } from "@/lib/mockInterviews";
import {
  fetchBackendMockInterviews,
  fetchUserInterviewSubmissions,
} from "@/services/mockInterviewService";

export const Route = createFileRoute("/mock-interviews")({
  head: () => ({
    meta: [
      { title: "Mock Interviews | Yuvro" },
      { name: "description", content: "Practice AI-led tech mock interviews with Vitarka." },
    ],
  }),
  component: MockHub,
});

const KEY = "yuvro-mock-interviews-enrolled";
const load = (): string[] => {
  try {
    const raw =
      localStorage.getItem(KEY) ||
      localStorage.getItem("yuvro_real_mock_interviews_enrolled");
    return raw ? JSON.parse(raw) : ["java-backend", "react-frontend"];
  } catch {
    return ["java-backend", "react-frontend"];
  }
};

function MockHub() {
  const [interviews, setInterviews] = useState<Interview[]>(() => {
    const enrolled = load();
    return INTERVIEWS.filter((i) => enrolled.includes(i.slug));
  });
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchBackendMockInterviews("ylabs"),
      fetchUserInterviewSubmissions("ylabs"),
    ])
      .then(([backendData, userSubmissions]) => {
        if (backendData && backendData.length > 0) {
          setInterviews(backendData);
          try {
            const allSlugs = backendData.map((b) => b.slug);
            localStorage.setItem(KEY, JSON.stringify(allSlugs));
            localStorage.setItem("yuvro_real_mock_interviews_enrolled", JSON.stringify(allSlugs));
          } catch {}
        }
        if (userSubmissions && Array.isArray(userSubmissions)) {
          setSubmissions(userSubmissions);
        }
      })
      .catch((err) => {
        console.error("Failed to load mock interview data:", err);
      });
  }, []);

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
              <p className="text-xs text-muted-foreground mt-0.5">{countText}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Available mock interview: <span className="font-medium text-foreground">0</span>
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">Buy</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buy mock interviews</DialogTitle>
                    <DialogDescription>
                      Mock interview purchases are not available yet.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {interviews.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
              You haven't added any mock interview yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:max-w-[850px]">
              {interviews.map((i) => (
                <MineCard
                  key={i.slug}
                  i={i}
                  isCompleted={checkCompleted(i, submissions)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function checkCompleted(i: Interview, submissions: any[]): boolean {
  if (hasCompletedInterview(i.slug, i.completed)) return true;
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

function MineCard({ i, isCompleted }: { i: Interview; isCompleted: boolean }) {
  const completed = isCompleted;
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
        <Button asChild size="sm" variant={completed ? "secondary" : "default"}>
          <Link
            to="/mock-interview/$slug"
            params={{ slug: i.slug }}
            search={{ report: false }}
          >
            {completed ? "Retake" : "Start interview"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
