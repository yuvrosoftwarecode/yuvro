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
    systemDesignScore?: number;
    eci: number;
  },
  hasLabs: boolean = true,
  hasAssessment: boolean = true,
  hasVitarka: boolean = true,
  hasSystemDesign: boolean = false
): EvaluationSummaryData {
  const first = candidate.name.split(" ")[0];
  const overall = candidate.eci;
  const verdict = overall >= 75 ? "Shortlisted" : overall >= 60 ? "Hold" : "Rejected";

  const blocks: SummaryBlockData[] = [];
  if (hasLabs) {
    blocks.push({
      title: "Engineering Labs",
      score: candidate.labsScore,
      summary: candidate.labsScore === 0
        ? `${first} did not submit code changes or pass any automated tests for the engineering labs.`
        : `${first} completed hands-on lab exercises with an evaluated score of ${candidate.labsScore}/100.`,
      strengths: candidate.labsScore === 0
        ? []
        : candidate.labsScore >= 75
          ? ["Implementation completeness", "Test pass verification"]
          : ["Partial task completion"],
      explore: candidate.labsScore === 0
        ? "Practical implementation and coding verification"
        : "Error handling and edge cases",
    });
  }
  if (hasAssessment) {
    blocks.push({
      title: "Assessment",
      score: candidate.assessmentScore,
      summary: candidate.assessmentScore === 0
        ? `${first} did not answer any assessment questions correctly.`
        : `${first} completed knowledge assessment questions with an evaluated score of ${candidate.assessmentScore}/100.`,
      strengths: candidate.assessmentScore === 0
        ? []
        : candidate.assessmentScore >= 75
          ? ["Conceptual accuracy", "Technical foundations"]
          : ["Foundational topics"],
      explore: candidate.assessmentScore === 0
        ? "Core concept fundamentals"
        : "Advanced problem-solving concepts",
    });
  }
  if (hasVitarka) {
    blocks.push({
      title: "Vitarka AI",
      score: candidate.vitarkaScore,
      summary: candidate.vitarkaScore === 0
        ? `${first} did not provide responses during the Vitarka AI technical discussion.`
        : `${first} engaged in the technical discussion with an evaluated score of ${candidate.vitarkaScore}/100.`,
      strengths: candidate.vitarkaScore === 0
        ? []
        : candidate.vitarkaScore >= 75
          ? ["Technical articulation", "Solution explanation"]
          : ["Basic technical communication"],
      explore: candidate.vitarkaScore === 0
        ? "Technical communication and problem articulation"
        : "Deep architecture trade-offs",
    });
  }
  if (hasSystemDesign) {
    const sdScore = candidate.systemDesignScore || 0;
    blocks.push({
      title: "System Design",
      score: sdScore,
      summary: sdScore === 0
        ? `${first} did not submit architecture diagrams, database schemas, or API contracts for the system design challenge.`
        : `${first} designed a distributed architecture solution with an evaluated score of ${sdScore}/100.`,
      strengths: sdScore === 0
        ? []
        : sdScore >= 75
          ? ["Scalable architecture design", "Clear data modeling and API contracts", "System bottleneck identification"]
          : ["High-level component breakdown", "Basic database schema design"],
      explore: sdScore === 0
        ? "Distributed system architecture, data modeling, and API contract design"
        : "High-throughput failover mechanisms and concurrency bottlenecks",
    });
  }

  const overallStrengths = overall === 0
    ? []
    : blocks.flatMap((b) => b.strengths).slice(0, 4);

  const overallExplore = overall === 0
    ? []
    : blocks.map((b) => b.explore);

  const overallText = overall === 0
    ? `${first} did not record passing scores, code submissions, or interview responses across the evaluation.`
    : `${first} demonstrated an aggregate evaluation score of ${overall}/100 across the assessed sections.`;

  return {
    overall,
    verdict,
    blocks,
    overallText,
    overallStrengths,
    overallExplore,
  };
}
