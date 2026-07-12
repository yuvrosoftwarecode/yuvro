import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { getCandidates } from "@/lib/recruiterCandidates";
import { getEvaluation } from "@/lib/recruiter";

export const Route = createFileRoute("/recruiter/evaluations/$id/candidates/$candidateId")({
  head: () => ({ meta: [{ title: "Candidate — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: CandidateDetailsStub,
});

function CandidateDetailsStub() {
  const { id, candidateId } = Route.useParams();
  const ev = getEvaluation(id);
  const c = getCandidates(id).find(x => x.id === candidateId);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link to="/recruiter/evaluations/$id/workspace" params={{ id }} search={{ tab: "candidates" }} className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to candidates
      </Link>
      <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-16 text-center">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">Candidate</div>
        <div className="mt-2 text-[26px] font-medium text-white">{c?.name ?? candidateId}</div>
        <div className="mt-1 text-[13px] text-neutral-500">{ev?.title}</div>
        <p className="mx-auto mt-6 max-w-md text-[13px] text-neutral-400">
          The complete Candidate Details module — engineering labs breakdown, assessment answers, Vitarka transcript, resume viewer, notes and hiring actions — will be designed in the next module.
        </p>
      </div>
    </div>
  );
}
