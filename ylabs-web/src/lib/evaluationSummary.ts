export interface SummaryBlockData {
  title: string;
  score: number;
  summary: string;
  strengths: string[];
  explore: string;
}

export interface EvaluationSummaryData {
  blocks: SummaryBlockData[];
  overall: number;
  verdict: "Shortlisted" | "Hold" | "Rejected";
  overallText: string;
  overallStrengths: string[];
  overallExplore: string[];
}

export function buildEvaluationSummary(
  candidate: {
    name: string;
    labsScore: number;
    assessmentScore: number;
    vitarkaScore: number;
    eci: number;
  },
  hasLabs: boolean = true,
  hasAssessment: boolean = true,
  hasVitarka: boolean = true
): EvaluationSummaryData {
  const first = candidate.name.split(" ")[0];
  const overall = candidate.eci;
  const verdict = overall >= 75 ? "Shortlisted" : overall >= 60 ? "Hold" : "Rejected";

  const blocks: SummaryBlockData[] = [];
  if (hasLabs) {
    blocks.push({
      title: "Engineering Labs",
      score: candidate.labsScore,
      summary: `${first} performed well in the Python API lab and fixed the validation issue while improving the database interaction. His debugging was systematic — he traced the API issue back to the SQL query.`,
      strengths: ["Python API debugging", "SQL troubleshooting", "Practical problem solving"],
      explore: "Transaction management",
    });
  }
  if (hasAssessment) {
    blocks.push({
      title: "Assessment",
      score: candidate.assessmentScore,
      summary: `${first} performed well on Python and database-related questions. Results were weaker on system-design concepts, which is worth exploring further.`,
      strengths: ["Python", "REST APIs", "SQL"],
      explore: "System design",
    });
  }
  if (hasVitarka) {
    blocks.push({
      title: "Vitarka AI",
      score: candidate.vitarkaScore,
      summary: `${first} explained the Python API changes he made in the lab and why he introduced the validation logic. He connected the SQL change to the API performance issue and handled follow-ups on error handling well.`,
      strengths: [
        "Explains implementation decisions",
        "Good Python/API understanding",
        "Handles technical follow-ups",
      ],
      explore: "Transaction-level reasoning",
    });
  }

  return {
    overall,
    verdict,
    blocks,
    overallText: `${first} shows good hands-on backend engineering ability, particularly in Python APIs, debugging and SQL troubleshooting. His Vitarka discussion was largely consistent with the work completed in the lab, which is a positive signal that he understands the implementation rather than simply completing the task. The main area to explore further is system design and transaction-level reasoning.`,
    overallStrengths: [
      "Strong hands-on Python/API work",
      "Good debugging and SQL troubleshooting",
      "Able to explain implementation decisions",
      "Consistent lab and Vitarka performance",
    ],
    overallExplore: ["System-design depth", "Transaction management"],
  };
}
