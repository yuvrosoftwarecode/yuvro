// Master candidate ledger for an evaluation.
// Every candidate associated with the evaluation, regardless of how they entered:
// Yuvro Invite, Follow-up Setup (bulk or individual), or the shared public link.
// Deduplicated by email — one record per candidate identity.

export type RecordSource = "Yuvro Invite" | "Follow-up Setup" | "Shared Link";
export type RecordStatus = "Not Submitted" | "Submitted";
export type RecordResult = "Passed" | "Failed" | "Not Evaluated";

export interface ActivityEvent {
  label: string;
  at: number | null;
}

export interface CandidateRecord {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  source: RecordSource;
  sentAt: number | null;
  accessedAt: number | null;
  status: RecordStatus;
  submittedAt: number | null;
  score: number | null;
  result: RecordResult;
  followUp: boolean;
  labsScore: number | null;
  assessmentScore: number | null;
  vitarkaScore: number | null;
  systemDesignScore?: number | null;
  eci: number | null;
  totalEarned?: number | null;
  totalPossible?: number | null;
  deadline: number | null;
  emailsSent: number;
  aiCall: boolean;
  lastActivity: number;
  activity: ActivityEvent[];
}

import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";

export async function fetchCandidateRecords(evId: string): Promise<CandidateRecord[]> {
  try {
    const data = await restApiAuthUtil.get<CandidateRecord[]>(`/skill_evaluation/evaluations/${evId}/records/`);
    return data;
  } catch (err) {
    console.error("Failed to fetch candidate records:", err);
    return [];
  }
}

export function recordTotals(rows: CandidateRecord[]) {
  return {
    total: rows.length,
    notSubmitted: rows.filter((r) => r.status === "Not Submitted").length,
    submitted: rows.filter((r) => r.status === "Submitted").length,
    passed: rows.filter((r) => r.result === "Passed").length,
    failed: rows.filter((r) => r.result === "Failed").length,
  };
}

export function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
