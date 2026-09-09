// Deterministic mock repository snapshot for a candidate's lab attempt.
// Produces the full file tree (changed + unchanged) and git-style diffs.

export type DiffKind = "modified" | "created" | "deleted";
export type RepoDiffLineType = "ctx" | "add" | "del";

export interface RepoDiffLine {
  type: RepoDiffLineType;
  oldNo?: number;
  newNo?: number;
  text: string;
}

export interface RepoFile {
  path: string;
  changed: boolean;
  kind?: DiffKind;
  additions: number;
  deletions: number;
  content: string[];
  diff: RepoDiffLine[];
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function rng(seed: number) {
  let s = seed || 1;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const BASE_TREE = [
  "README.md",
  "package.json",
  "src/index.ts",
  "src/config.ts",
  "src/services/order-service.ts",
  "src/services/payment-service.ts",
  "src/repositories/order-repository.ts",
  "src/models/order.ts",
  "src/models/payment.ts",
  "src/utils/logger.ts",
  "src/utils/currency.ts",
  "tests/order-service.test.ts",
  "tests/payment-service.test.ts",
];

function baseContent(path: string, r: () => number): string[] {
  if (path.endsWith(".md"))
    return [
      "# Order Platform",
      "",
      "Service that reconciles orders and payments.",
      "",
      "## Getting started",
      "",
      "```bash",
      "npm install",
      "npm test",
      "```",
    ];
  if (path.endsWith("package.json"))
    return [
      "{",
      '  "name": "order-platform",',
      '  "version": "1.4.2",',
      '  "scripts": {',
      '    "test": "vitest run",',
      '    "build": "tsc -p ."',
      "  }",
      "}",
    ];
  const name = path.split("/").pop()!.replace(/\.\w+$/, "");
  const fn = name.replace(/[-.](\w)/g, (_, c) => c.toUpperCase());
  const n = 12 + Math.floor(r() * 8);
  const lines = [
    `import { config } from "../config";`,
    `import { logger } from "../utils/logger";`,
    "",
    `export interface ${fn[0].toUpperCase()}${fn.slice(1)}Input {`,
    "  id: string;",
    "  amount: number;",
    "}",
    "",
    `export function ${fn}(input: ${fn[0].toUpperCase()}${fn.slice(1)}Input) {`,
    "  logger.debug(\"handling\", input.id);",
    "  const rows = load(input.id);",
    "  return rows.map(normalise);",
    "}",
  ];
  while (lines.length < n) lines.push(`// ${fn}: step ${lines.length}`);
  return lines;
}

function buildDiff(content: string[], r: () => number, kind: DiffKind) {
  const diff: RepoDiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;

  if (kind === "created") {
    content.forEach(text => diff.push({ type: "add", newNo: newNo++, text }));
    return { diff, next: content };
  }
  if (kind === "deleted") {
    content.forEach(text => diff.push({ type: "del", oldNo: oldNo++, text }));
    return { diff, next: [] as string[] };
  }

  const next: string[] = [];
  const hunkStart = 3 + Math.floor(r() * 3);
  content.forEach((text, i) => {
    const inHunk = i >= hunkStart && i < hunkStart + 6;
    if (inHunk && i % 2 === 0) {
      diff.push({ type: "del", oldNo: oldNo++, text });
      const replaced = text.includes("//")
        ? text.replace("//", "// FIXED:")
        : text.replace(/;?$/, "") + " // hardened";
      diff.push({ type: "add", newNo: newNo++, text: replaced });
      next.push(replaced);
    } else {
      diff.push({ type: "ctx", oldNo: oldNo++, newNo: newNo++, text });
      next.push(text);
    }
  });
  if (r() < 0.7) {
    const extra = [
      "",
      "export function assertInvariant(value: unknown) {",
      "  if (value == null) throw new Error(\"invariant violated\");",
      "}",
    ];
    extra.forEach(text => {
      diff.push({ type: "add", newNo: newNo++, text });
      next.push(text);
    });
  }
  return { diff, next };
}

export function getLabRepo(
  labId: string,
  changedFiles: { path: string; kind: DiffKind }[]
): RepoFile[] {
  const r = rng(hash(labId + ":repo"));
  const changedMap = new Map<string, DiffKind>();
  changedFiles.forEach(f => changedMap.set(f.path, f.kind));

  const paths = Array.from(new Set([...BASE_TREE, ...changedFiles.map(f => f.path)])).sort();

  return paths.map(path => {
    const kind = changedMap.get(path);
    const original = baseContent(path, r);
    if (!kind) {
      return { path, changed: false, additions: 0, deletions: 0, content: original, diff: [] };
    }
    const { diff, next } = buildDiff(original, r, kind);
    return {
      path,
      changed: true,
      kind,
      additions: diff.filter(l => l.type === "add").length,
      deletions: diff.filter(l => l.type === "del").length,
      content: next,
      diff,
    };
  });
}
