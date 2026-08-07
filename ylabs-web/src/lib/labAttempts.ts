import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export type DiffLineType = "ctx" | "add" | "del";
export interface DiffLine { type: DiffLineType; oldNo?: number; newNo?: number; text: string }
export interface DiffFile {
  path: string;
  status: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  lines: DiffLine[];
}
export interface AttemptTicket {
  id: string;
  title: string;
  status: "Completed" | "In Progress" | "Failed";
  score: number;
  xp: number;
  timeMin: number;
  submittedAt: string;
  files: DiffFile[];
  raw_diff?: string | null;
}
export interface AttemptSprint {
  id: string;
  name: string;
  progressPct: number;
  tickets: AttemptTicket[];
}
export interface LabAttemptUser {
  id: string;
  name: string;
  email: string;
  cohort: string;
  status: "Completed" | "In Progress" | "Dropped";
  progressPct: number;
  xp: number;
  lastActive: string;
  sprints: AttemptSprint[];
}

export function parseDiff(rawDiff: string): DiffFile[] {
  if (!rawDiff) return [];
  const files: DiffFile[] = [];
  
  // Basic parsing of git diff format
  const blocks = rawDiff.split(/^diff --git /m).filter(Boolean);
  
  for (const block of blocks) {
    const lines = block.split('\n');
    let path = 'unknown';
    const firstLine = lines[0]; // e.g. a/file.ts b/file.ts
    const m = firstLine.match(/a\/(.+?) b\/(.+)/);
    if (m) path = m[2];
    
    let status: "modified" | "added" | "deleted" = "modified";
    if (block.includes("\nnew file mode ")) status = "added";
    if (block.includes("\ndeleted file mode ")) status = "deleted";
    
    const diffLines: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;
    
    let oldNo = 0;
    let newNo = 0;
    let inHunk = false;
    
    for (const line of lines) {
      if (line.startsWith('@@ ')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldNo = parseInt(match[1], 10);
          newNo = parseInt(match[2], 10);
          inHunk = true;
          continue;
        }
      }
      
      if (!inHunk) continue;
      
      if (line.startsWith('\\ No newline')) continue;
      
      if (line.startsWith('+')) {
        additions++;
        diffLines.push({ type: 'add', newNo: newNo++, text: line.substring(1) });
      } else if (line.startsWith('-')) {
        deletions++;
        diffLines.push({ type: 'del', oldNo: oldNo++, text: line.substring(1) });
      } else if (line.startsWith(' ')) {
        diffLines.push({ type: 'ctx', oldNo: oldNo++, newNo: newNo++, text: line.substring(1) });
      }
    }
    
    files.push({
      path,
      status,
      additions,
      deletions,
      lines: diffLines
    });
  }
  
  return files;
}

export async function getLabAttempts(labId: string, labTitle: string, lang = "ts"): Promise<LabAttemptUser[]> {
  try {
    const users = await restApiAuthUtil.get<LabAttemptUser[]>(`/lab/labs/${labId}/attempts/`);
    
    for (const user of users) {
      for (const sprint of user.sprints) {
        for (const ticket of sprint.tickets) {
          if (ticket.raw_diff) {
            ticket.files = parseDiff(ticket.raw_diff);
          } else {
            ticket.files = [];
          }
        }
      }
    }
    return users;
  } catch (error) {
    console.error("Failed to load lab attempts", error);
    return [];
  }
}
