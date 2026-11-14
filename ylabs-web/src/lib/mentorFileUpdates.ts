export type MentorFileUpdate = {
  path: string;
  language: string;
  code: string;
};

const FILE_EXT =
  /\.(py|js|jsx|ts|tsx|mjs|cjs|java|go|rs|rb|php|c|cc|cpp|h|hpp|cs|kt|swift|sql|html|css|scss|json|md|yml|yaml|toml|xml|sh|bash|zsh|txt|vue|svelte|ini|cfg|gradle|properties|lock|env)$/i;

function normalizePath(value: string): string {
  return value.trim().replace(/^\/+/, "").replace(/^[`'"]+|[`'"]+$/g, "");
}

export function looksLikeFilePath(value: string): boolean {
  const s = normalizePath(value);
  if (!s || s.length > 240) return false;
  if (/\s/.test(s)) return false;
  if (/^https?:/i.test(s)) return false;
  if (FILE_EXT.test(s)) return true;
  return s.includes("/") && !s.endsWith("/");
}

function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "text";
  const map: Record<string, string> = {
    py: "python",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    md: "markdown",
    yml: "yaml",
    sh: "bash",
  };
  return map[ext] || ext;
}

export function parseFenceInfo(info: string): { language: string; path?: string } {
  const raw = (info || "").trim();
  if (!raw) return { language: "text" };

  const filenameAttr = raw.match(/filename\s*=\s*["']([^"']+)["']/i);
  if (filenameAttr && looksLikeFilePath(filenameAttr[1])) {
    const langToken = raw.split(/\s+/)[0] || "";
    const language = langToken.includes("=") ? languageFromPath(filenameAttr[1]) : langToken;
    return { language: language || "text", path: normalizePath(filenameAttr[1]) };
  }

  const colon = raw.match(/^([A-Za-z0-9_+#-]+)\s*:\s*(.+)$/);
  if (colon && looksLikeFilePath(colon[2])) {
    return { language: colon[1], path: normalizePath(colon[2]) };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const rest = parts.slice(1).join(" ");
    if (looksLikeFilePath(rest)) {
      return { language: parts[0], path: normalizePath(rest) };
    }
  }

  if (looksLikeFilePath(raw)) {
    return { language: languageFromPath(raw), path: normalizePath(raw) };
  }

  return { language: parts[0] || "text" };
}

function precedingPath(content: string, fenceIndex: number): string | undefined {
  const before = content.slice(0, fenceIndex);
  const lines = before.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const labeled = trimmed.match(
      /^(?:(?:file|path)\s*:\s*|(?:#+\s*))?[*`'"[]*([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)[\]*`'"]*(?:\*\*)?\s*$/i,
    );
    if (labeled && looksLikeFilePath(labeled[1])) return normalizePath(labeled[1]);
    const updating = trimmed.match(
      /(?:updating|updated|editing|edit|creating|create|write|wrote)\s+[*`'"[]*([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)[\]*`'"]*/i,
    );
    if (updating && looksLikeFilePath(updating[1])) return normalizePath(updating[1]);
    break;
  }
  return undefined;
}

function isFilenameOnlyBlock(code: string, activeFile?: string): boolean {
  const t = code.trim();
  if (!t) return true;
  if (activeFile && t === activeFile) return true;
  if (!t.includes("\n") && t.length < 40 && looksLikeFilePath(t)) return true;
  return false;
}

export function resolveAgainstKnownFiles(path: string, knownFiles?: string[]): string {
  const n = normalizePath(path);
  if (!knownFiles?.length) return n;
  if (knownFiles.includes(n)) return n;
  const base = n.split("/").pop() || n;
  const byBase = knownFiles.filter((f) => f === n || f.endsWith(`/${n}`) || f.split("/").pop() === base);
  if (byBase.length === 1) return byBase[0];
  return n;
}

export function parseFileUpdates(
  content: string,
  fallbackFile?: string,
  knownFiles?: string[],
): MentorFileUpdate[] {
  const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
  const parsed: MentorFileUpdate[] = [];
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(content))) {
    const info = parseFenceInfo(match[1] || "");
    const body = (match[2] || "").replace(/\n$/, "");
    if (isFilenameOnlyBlock(body, fallbackFile)) continue;
    const fromPrev = precedingPath(content, match.index);
    const path = info.path || fromPrev;
    parsed.push({
      path: path ? resolveAgainstKnownFiles(path, knownFiles) : "",
      language: info.language || "text",
      code: body,
    });
  }

  const labeled = parsed.filter((u) => u.path);
  if (labeled.length > 0) return labeled;

  if (fallbackFile && parsed.length > 0) {
    const last = parsed[parsed.length - 1];
    return [
      {
        ...last,
        path: resolveAgainstKnownFiles(fallbackFile, knownFiles),
      },
    ];
  }

  return [];
}

export function explanationFromMentorContent(content: string, updates: MentorFileUpdate[]): string {
  let explanation = content.replace(/```[\s\S]*?```/g, "").trim();
  explanation = explanation
    .replace(/^#+\s+.*$/gm, "")
    .replace(/^Hello\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Hi\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Okay,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Sure,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Certainly,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/Here'?s the code you'?ll need for.*$/im, "")
    .replace(/Here is the (?:solution|code).*$/im, "")
    .trim();

  if (explanation) return explanation;
  const names = updates.map((u) => u.path).filter(Boolean);
  if (names.length === 1) return `Updated ${names[0]} with the required code.`;
  if (names.length > 1) return `Updated ${names.join(", ")}.`;
  return "Updated file with the required code.";
}

export function findUpdateForCode(updates: MentorFileUpdate[], code: string): MentorFileUpdate | undefined {
  const trimmed = code.replace(/\n$/, "");
  return updates.find((u) => u.code === code || u.code === trimmed || u.code.trim() === trimmed.trim());
}
