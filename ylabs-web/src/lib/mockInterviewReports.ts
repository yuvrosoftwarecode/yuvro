import type { Report } from "@/components/InterviewReport";

const key = (slug: string) => `yuvro-mock-interview-report:${slug}`;
const historyKey = (slug: string) => `yuvro-mock-interview-history:${slug}`;

/**
 * Purges all mock interview reports and histories from browser storage.
 * Reports, transcripts, and scores must NEVER be stored in client-side storage
 * and must come strictly from the backend API.
 */
export function purgeMockInterviewStorage(slug?: string) {
  try {
    if (slug) {
      localStorage.removeItem(key(slug));
      localStorage.removeItem(historyKey(slug));
      sessionStorage.removeItem(key(slug));
      sessionStorage.removeItem(historyKey(slug));
    }
    localStorage.removeItem("yuvro-mock-interviews-enrolled");
    localStorage.removeItem("yuvro_real_mock_interviews_enrolled");
  } catch {}
}

export function readInterviewReport(slug: string): Report | null {
  purgeMockInterviewStorage(slug);
  return null;
}

export function readInterviewReportHistory(slug: string): Report[] {
  purgeMockInterviewStorage(slug);
  return [];
}

export function captureInterviewReport(slug: string, _report?: Report) {
  // Mock interview reports must NEVER be stored in localStorage or sessionStorage.
  // All reports are strictly persisted and fetched via authoritative backend API calls.
  purgeMockInterviewStorage(slug);
}

export function hasCompletedInterview(_slug: string, completed: number) {
  return completed > 0;
}

export function submissionToReport(sub: any, roleName: string): Report {
  const rep = sub.report || sub.report_summary || {};
  const score =
    sub.marks != null
      ? Math.round(Number(sub.marks))
      : rep.overall_score != null
      ? Math.round(Number(rep.overall_score))
      : 0;

  const dateRaw = sub.submitted_at || sub.completed_at || sub.created_at || sub.started_at;
  const dateObj = dateRaw ? new Date(dateRaw) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
    : "";
  const fullDateStr = timeStr ? `${dateStr}, ${timeStr}` : dateStr;

  let durationStr = sub.actual_duration_display;
  if (!durationStr && sub.started_at && sub.completed_at) {
    const diffSecs = Math.max(
      1,
      Math.round(
        (new Date(sub.completed_at).getTime() - new Date(sub.started_at).getTime()) / 1000
      )
    );
    durationStr = `${Math.floor(diffSecs / 60)}m ${diffSecs % 60}s`;
  }
  if (!durationStr) durationStr = "0m 30s";

  // Skills
  const rawSkills = rep.skill_analysis;
  let skills: { name: string; score: number; description: string }[] = [];
  if (rawSkills && typeof rawSkills === "object") {
    if (Array.isArray(rawSkills)) {
      skills = rawSkills.map((s: any) => ({
        name: s.name || s.skill || "Technical Skill",
        score: Math.round(Number(s.score || score / 10)),
        description:
          s.description ||
          s.feedback ||
          (s.score >= 7 ? "Solid technical depth." : "Revisit core concepts."),
      }));
    } else {
      skills = Object.entries(rawSkills).map(([name, s]: [string, any]) => ({
        name,
        score: Math.round(Number(s.score || score / 10)),
        description:
          s.feedback ||
          s.description ||
          (s.score >= 7 ? "Solid technical depth." : "Revisit core concepts."),
      }));
    }
  }
  if (skills.length === 0) {
    skills = [
      {
        name: "Technical Proficiency",
        score: Math.round(score / 10),
        description:
          score >= 70
            ? "Demonstrated clear technical understanding."
            : "Practice core implementation and fundamentals.",
      },
      {
        name: "Problem Solving",
        score: Math.max(0, Math.round(score / 12)),
        description: "Approach, algorithm selection, and structure.",
      },
      {
        name: "Communication",
        score: Math.max(0, Math.round(score / 11)),
        description: "Articulation and clarity during interview.",
      },
    ];
  }

  // Competencies
  const competencies = skills.map((s) => ({ name: s.name, value: s.score })).slice(0, 5);
  while (competencies.length < 3) {
    if (!competencies.some((c) => c.name === "Communication")) {
      competencies.push({ name: "Communication", value: Math.max(0, Math.round(score / 11)) });
    } else if (!competencies.some((c) => c.name === "Problem Solving")) {
      competencies.push({ name: "Problem Solving", value: Math.max(0, Math.round(score / 12)) });
    } else {
      competencies.push({ name: "Depth", value: Math.max(0, Math.round(score / 10)) });
    }
  }

  // Questions
  const rawQA = rep.question_analysis;
  let questions: {
    question: string;
    category: string;
    score: number;
    answer: string;
    missing: string;
    tip: string;
  }[] = [];

  if (Array.isArray(rawQA) && rawQA.length > 0) {
    questions = rawQA.map((q: any) => ({
      question: q.question || "Interview question",
      category: q.type || "Technical",
      score: Math.round(Number(q.ai_score || 0)),
      answer: q.user_answer || "No response provided.",
      missing:
        q.what_could_be_better?.[0] ||
        q.missing_points?.[0] ||
        "Provide more concrete implementation details and trade-offs.",
      tip:
        q.recommended_response ||
        "Structure your answer with approach, trade-offs, and clear examples.",
    }));
  } else if (sub.state_data?.interview && Array.isArray(sub.state_data.interview)) {
    questions = sub.state_data.interview.map((q: any) => {
      const a = sub.state_data?.answers?.[String(q.id)]?.answer || "Not answered.";
      const s = sub.state_data?.answers?.[String(q.id)]?.score || 0;
      return {
        question: q.question,
        category: q.topic || "Technical",
        score: Math.round(Number(s) * 10),
        answer: a,
        missing: "More specifics: a real example and trade-offs.",
        tip: "Use a short structure: context, approach, trade-offs, result.",
      };
    });
  }

  // Transcript
  let transcript: { from: "ai" | "me"; text: string; time: string }[] = [];
  if (Array.isArray(sub.transcript) && sub.transcript.length > 0) {
    transcript = sub.transcript.map((t: any) => ({
      from: t.message_type === "assistant" || t.who === "ai" ? "ai" : "me",
      text: t.content || t.text || "",
      time: t.created_at
        ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
    }));
  } else if (questions.length > 0) {
    questions.forEach((q) => {
      transcript.push({ from: "ai", text: q.question, time: "" });
      if (q.answer && q.answer !== "No response provided." && q.answer !== "Not answered.") {
        transcript.push({ from: "me", text: q.answer, time: "" });
      }
    });
  }

  return {
    id: String(sub.id),
    role: roleName,
    duration: durationStr,
    date: fullDateStr,
    score,
    summary:
      rep.feedback_summary ||
      rep.executive_summary ||
      (score >= 75
        ? "Strong performance with clear technical depth."
        : score >= 50
        ? "Solid practice session. Revisit key concepts to sharpen your responses."
        : "Candidate completed the interview session. Keep practicing to build confidence and depth."),
    strength:
      rep.key_takeaways?.strengths?.[0] ||
      (score >= 50 ? "Engaged constructively with technical questions." : "Started the practice session."),
    focus:
      rep.key_takeaways?.improvements?.[0] ||
      "Give structured answers with concrete examples and trade-offs.",
    competencies,
    skills,
    questions,
    transcript,
  };
}
