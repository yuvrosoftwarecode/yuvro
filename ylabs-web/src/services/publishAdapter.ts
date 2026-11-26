import {
  Evaluation,
  getEvaluation,
  saveEvaluation,
  evaluationTotals,
} from "@/lib/recruiter";

export type Candidate = { name: string; email: string };

export type PublishPayload = {
  evaluationId: string;
  delivery: "email" | "link" | "csv";
  candidates: Candidate[];
  invitation?: { subject: string; body: string };
  window: { opensAt: string | null; closesAt: string | null };
};

export type PublishSummary = {
  title: string;
  sections: number;
  minutes: number;
  marks: number;
  vitarkaEnabled: boolean;
  companyName: string;
};

export function getCompanyFromStorage(): string {
  if (typeof window === "undefined") return "Your Company";
  try {
    const raw = localStorage.getItem("pl-recruiter-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.company?.trim()) return parsed.company.trim();
      if (parsed.org?.trim()) return parsed.org.trim();
    }
  } catch {
    // ignore
  }
  return "Your Company";
}

export async function getPublishSummary(
  evaluationId: string,
  cachedEv?: Evaluation,
): Promise<PublishSummary> {
  const ev = cachedEv || (await getEvaluation(evaluationId));
  if (!ev) {
    return {
      title: "Untitled Evaluation",
      sections: 1,
      minutes: 30,
      marks: 100,
      vitarkaEnabled: true,
      companyName: getCompanyFromStorage(),
    };
  }

  const totals = evaluationTotals(ev);
  const vitarkaEnabled = Boolean(
    ev.vitarkaEnabled ?? ev.settings?.vitarkaEnabled ?? true,
  );
  const companyName =
    ev.company?.trim() || getCompanyFromStorage();

  return {
    title: ev.title || "Untitled Evaluation",
    sections: Math.max(1, ev.sections?.length || 1),
    minutes: totals.minutes,
    marks: totals.marks,
    vitarkaEnabled,
    companyName,
  };
}

export async function getPublicLink(evaluationId: string): Promise<string> {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/evaluation?e=${encodeURIComponent(evaluationId)}`;
  }
  return `https://app.yuvro.com/e/${evaluationId}`;
}

export async function publishEvaluation(
  payload: PublishPayload,
  cachedEv?: Evaluation,
): Promise<{ status: "published"; evaluation?: Evaluation }> {
  const ev = cachedEv || (await getEvaluation(payload.evaluationId));
  if (!ev) {
    throw new Error("Evaluation not found");
  }

  const opensAt = payload.window.opensAt
    ? new Date(payload.window.opensAt).toISOString()
    : undefined;
  const closesAt = payload.window.closesAt
    ? new Date(payload.window.closesAt).toISOString()
    : undefined;

  const updatedEv: Evaluation = {
    ...ev,
    status: "published",
    publishedAt: Date.now(),
    start_datetime: opensAt,
    expiry_datetime: closesAt,
    candidatesInvited:
      payload.delivery === "link" ? 0 : payload.candidates.length,
    invite: {
      type: payload.delivery === "csv" ? "email" : payload.delivery,
      emails: payload.candidates.map((c) => ({ name: c.name, email: c.email })),
      expiry: "custom",
      attempts: "1",
      subject: payload.invitation?.subject || `Invitation: ${ev.title}`,
      body: payload.invitation?.body || "",
    },
  };

  const saved = await saveEvaluation(updatedEv);
  if (!saved) {
    throw new Error("Failed to save published evaluation");
  }

  return { status: "published", evaluation: saved };
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function parseCsv(file: File): Promise<Candidate[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = splitCsvRow(headerLine).map((h) =>
    h.toLowerCase().trim().replace(/^["']|["']$/g, ""),
  );

  let emailIdx = headers.findIndex(
    (h) => h === "email" || h === "email address" || h === "e-mail" || h.includes("email"),
  );
  let nameIdx = headers.findIndex(
    (h) =>
      h === "name" ||
      h === "candidate name" ||
      h === "full name" ||
      h === "candidate" ||
      h.includes("name"),
  );

  // If no header matches, check if line 1 itself is data
  const candidates: Candidate[] = [];
  const seenEmails = new Set<string>();

  const startLine = emailIdx !== -1 ? 1 : 0;
  if (emailIdx === -1) {
    // If no header found, assume column 0 is email or col 1 is email
    const firstRowCols = splitCsvRow(lines[0]);
    if (firstRowCols.some((c) => EMAIL_REGEX.test(c.trim()))) {
      emailIdx = firstRowCols.findIndex((c) => EMAIL_REGEX.test(c.trim()));
      nameIdx = emailIdx === 0 && firstRowCols.length > 1 ? 1 : 0;
    } else {
      // Default fallback
      emailIdx = 0;
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const rawEmail = (cols[emailIdx] || "").trim().replace(/^["']|["']$/g, "");
    const rawName =
      nameIdx !== -1 && cols[nameIdx]
        ? cols[nameIdx].trim().replace(/^["']|["']$/g, "")
        : "";

    if (rawEmail && EMAIL_REGEX.test(rawEmail)) {
      const lowerEmail = rawEmail.toLowerCase();
      if (!seenEmails.has(lowerEmail)) {
        seenEmails.add(lowerEmail);
        candidates.push({
          name: rawName,
          email: rawEmail,
        });
      }
    }
  }

  return candidates;
}

function splitCsvRow(row: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      if (inQuotes && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      res.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  res.push(cur);
  return res;
}
