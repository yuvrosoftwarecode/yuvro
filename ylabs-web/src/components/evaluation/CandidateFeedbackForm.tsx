import { useState } from "react";
import { Star } from "lucide-react";
import { restApiAuthUtil } from "../../utils/RestApiAuthUtil";

export function CandidateFeedbackForm({ evaluationId, guestToken }: { evaluationId: string, guestToken?: string | null }) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (!evaluationId) {
      alert("Error: Evaluation ID is missing. Your feedback cannot be saved.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (evaluationId) {
        await restApiAuthUtil.post(
          `/skill_evaluation/evaluations/${evaluationId}/feedback/`,
          { rating, description },
          { headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined }
        );
      }
      setIsSubmitted(true);
    } catch (e) {
      console.error("Error submitting feedback:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="mt-12 rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center text-emerald-800">
        <h3 className="font-semibold text-emerald-900">Thank you for your feedback!</h3>
        <p className="mt-1 text-sm text-emerald-700">We appreciate you taking the time to share your experience.</p>
      </div>
    );
  }

  return (
    <div className="mt-12 rounded-xl border border-neutral-200 bg-white p-6 text-left shadow-sm max-w-md mx-auto">
      <h3 className="text-[15px] font-medium text-neutral-900">How was your evaluation experience?</h3>
      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-8 w-8 ${(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "text-neutral-200"} transition-colors`}
            />
          </button>
        ))}
      </div>
      <div className="mt-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us more about your experience (optional)..."
          className="w-full rounded-lg border border-neutral-200 p-3 text-[13px] placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          rows={3}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </button>
    </div>
  );
}
