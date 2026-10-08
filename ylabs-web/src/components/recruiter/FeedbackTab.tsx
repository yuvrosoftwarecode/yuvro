import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { restApiAuthUtil } from "../../utils/RestApiAuthUtil";

export function FeedbackTab({ ev }: { ev: any }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const data = await restApiAuthUtil.get<any[]>(`/skill_evaluation/evaluations/${ev.id}/feedback/`);
        setFeedbacks(data);
      } catch (err) {
        console.error("Failed to fetch feedbacks", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, [ev.id]);

  if (loading) {
    return <div className="py-12 text-center text-[13px] text-neutral-500">Loading feedback...</div>;
  }

  if (feedbacks.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-[14px] font-medium text-neutral-900">No Feedback Yet</div>
        <div className="mt-1 text-[13px] text-neutral-500">Candidates haven't provided any feedback for this evaluation.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-medium text-neutral-900">Candidate Feedback</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {feedbacks.map((f) => (
          <div key={f.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium text-neutral-900">
                {f.candidate_name || "Unknown Candidate"}
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= f.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`}
                  />
                ))}
              </div>
            </div>
            {f.candidate_email && (
              <div className="mt-0.5 text-[12px] text-neutral-500">{f.candidate_email}</div>
            )}
            {f.description && (
              <div className="mt-3 text-[13px] leading-relaxed text-neutral-700">
                "{f.description}"
              </div>
            )}
            <div className="mt-4 text-[11px] text-neutral-400">
              Submitted on {new Date(f.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}