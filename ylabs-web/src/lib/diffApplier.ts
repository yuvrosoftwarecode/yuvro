/**
 * Utilities for diff parsing, code block extraction, and patch application.
 * Supports Search/Replace blocks, unified diffs, and multi-file agent output.
 * Fully compatible with standard Git diff patch format.
 */
import { createPatch, applyPatch } from "diff";

export interface ParsedFileChange {
  path: string;
  code: string;
  language?: string;
  isDiff: boolean;
  status: "modified" | "new";
  hunkCount?: number;
  gitPatch?: string;
}

/**
 * Apply Search/Replace block, Unified diff, or full code to an existing file string.
 * Returns the patched file result and standard unified Git diff patch.
 */
export function applyDiffOrCode(
  original: string,
  diffOrCode: string,
  filePath?: string
): {
  success: boolean;
  result: string;
  message: string;
  method: "search-replace" | "unified" | "full";
  gitPatch?: string;
} {
  if (!original) {
    const gitPatch = createPatch(filePath || "file", "", diffOrCode);
    return { success: true, result: diffOrCode, message: "Created file content", method: "full", gitPatch };
  }

  // Normalize line endings
  const cleanOriginal = original.replace(/\r\n/g, "\n");
  const cleanDiff = diffOrCode.replace(/\r\n/g, "\n");
  const isDiff = isDiffContent(cleanDiff);

  // 1. Check for Unified Diff format (--- / +++ / @@) using jsdiff applyPatch
  if (cleanDiff.includes("@@") && (cleanDiff.includes("---") || cleanDiff.includes("+++") || cleanDiff.includes("Index:"))) {
    try {
      const patched = applyPatch(cleanOriginal, cleanDiff);
      if (typeof patched === "string") {
        const gitPatch = createPatch(filePath || "file", cleanOriginal, patched);
        return {
          success: true,
          result: patched,
          message: "Applied unified git patch",
          method: "unified",
          gitPatch,
        };
      }
    } catch {
      // Fallback to manual hunk applier if applyPatch throws
    }
  }

  // 2. Check for SEARCH / REPLACE blocks
  // Regex without /m flag so $ matches only end of diff string (or marker) and never truncates multi-line replace blocks!
  const searchReplaceRegex =
    /(?:^|\n)[ \t]*<{3,7}\s*SEARCH[^\n]*\n([\s\S]*?)\n[ \t]*={3,7}[^\n]*\n([\s\S]*?)(?:\n[ \t]*>{3,7}\s*(?:REPLACE)?[^\n]*|\s*$)/gi;
  const matches = [...cleanDiff.matchAll(searchReplaceRegex)];

  if (matches.length > 0) {
    let current = cleanOriginal;
    let appliedCount = 0;

    for (const match of matches) {
      const searchBlock = match[1];
      const replaceBlock = match[2];

      // Level 1: Exact substring match
      if (current.includes(searchBlock)) {
        current = current.replace(searchBlock, replaceBlock);
        appliedCount++;
        continue;
      }

      // Level 2: Trimmed search block match
      const trimmedSearch = searchBlock.trim();
      if (trimmedSearch && current.includes(trimmedSearch)) {
        current = current.replace(trimmedSearch, replaceBlock.trim());
        appliedCount++;
        continue;
      }

      // Level 3: Strip comment markers and ellipses from search block (e.g. "// exact lines...", "# exact lines...", "...")
      const cleanSearch = searchBlock
        .split("\n")
        .filter((l) => !/^(?:#|\/\/|\/\*|--)\s*(?:exact lines|code to replace|\.\.\.)/i.test(l.trim()) && l.trim() !== "...")
        .join("\n");

      if (cleanSearch && current.includes(cleanSearch)) {
        current = current.replace(cleanSearch, replaceBlock);
        appliedCount++;
        continue;
      }

      // Level 4: Whitespace-tolerant line-by-line match with indentation preservation
      const searchLines = (cleanSearch || searchBlock).split("\n").filter((l) => l.trim().length > 0);
      if (searchLines.length > 0) {
        const currentLines = current.split("\n");
        let foundIdx = -1;

        for (let i = 0; i <= currentLines.length - searchLines.length; i++) {
          let allMatch = true;
          for (let j = 0; j < searchLines.length; j++) {
            if (currentLines[i + j].trim() !== searchLines[j].trim()) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            foundIdx = i;
            break;
          }
        }

        if (foundIdx !== -1) {
          const searchBaseIndent =
            (cleanSearch || searchBlock).split("\n").find((l) => l.trim())?.match(/^\s*/)?.[0] || "";
          const origIndent = currentLines[foundIdx].match(/^\s*/)?.[0] || "";

          const replaceLines = replaceBlock.split("\n").map((l) => {
            if (!l.trim()) return "";
            if (searchBaseIndent && l.startsWith(searchBaseIndent)) {
              return origIndent + l.slice(searchBaseIndent.length);
            }
            return origIndent + l.trimStart();
          });

          currentLines.splice(foundIdx, searchLines.length, ...replaceLines);
          current = currentLines.join("\n");
          appliedCount++;
          continue;
        }
      }
    }

    if (appliedCount > 0) {
      const gitPatch = createPatch(filePath || "file", cleanOriginal, current);
      return {
        success: true,
        result: current,
        message: `Applied ${appliedCount}/${matches.length} diff hunk(s)`,
        method: "search-replace",
        gitPatch,
      };
    }
  }

  // 2. Fallback Unified Diff parser
  if (cleanDiff.includes("@@") && (cleanDiff.includes("---") || cleanDiff.includes("+++"))) {
    const hunkRegex = /@@\s*-\d+(?:,\d+)?\s*\+\d+(?:,\d+)?\s*@@[^\n]*\n([\s\S]*?)(?=(?:@@|$))/g;
    const hunks = [...cleanDiff.matchAll(hunkRegex)];
    if (hunks.length > 0) {
      let current = cleanOriginal;
      let appliedHunks = 0;

      for (const hunk of hunks) {
        const hunkLines = hunk[1].split("\n");
        const oldLines: string[] = [];
        const newLines: string[] = [];

        for (const line of hunkLines) {
          if (line.startsWith("-")) {
            oldLines.push(line.slice(1));
          } else if (line.startsWith("+")) {
            newLines.push(line.slice(1));
          } else if (line.startsWith(" ")) {
            oldLines.push(line.slice(1));
            newLines.push(line.slice(1));
          }
        }

        const oldBlock = oldLines.join("\n").trim();
        const newBlock = newLines.join("\n");
        if (oldBlock && current.includes(oldBlock)) {
          current = current.replace(oldBlock, newBlock);
          appliedHunks++;
        }
      }

      if (appliedHunks > 0) {
        const gitPatch = createPatch(filePath || "file", cleanOriginal, current);
        return {
          success: true,
          result: current,
          message: `Applied ${appliedHunks} unified diff hunk(s)`,
          method: "unified",
          gitPatch,
        };
      }
    }
  }

  // 2.5. Simple - / + line diff fallback
  const diffLines = cleanDiff.split("\n");
  const minusLines = diffLines.filter((l) => l.startsWith("- ") || l.startsWith("-\t")).map((l) => l.slice(2));
  const plusLines = diffLines.filter((l) => l.startsWith("+ ") || l.startsWith("+\t")).map((l) => l.slice(2));
  if (minusLines.length > 0 && plusLines.length > 0) {
    const oldBlock = minusLines.join("\n");
    const newBlock = plusLines.join("\n");
    if (cleanOriginal.includes(oldBlock)) {
      const res = cleanOriginal.replace(oldBlock, newBlock);
      const gitPatch = createPatch(filePath || "file", cleanOriginal, res);
      return {
        success: true,
        result: res,
        message: "Applied line diff",
        method: "unified",
        gitPatch,
      };
    }
  }

  // 3. Fallback: If this is explicitly diff content that couldn't be matched, DO NOT overwrite with raw diff!
  if (isDiff) {
    return {
      success: false,
      result: cleanOriginal,
      message: "Diff hunks could not be matched automatically. Please review changes manually.",
      method: "search-replace",
    };
  }

  // Full file replacement (when full code was generated)
  const gitPatch = createPatch(filePath || "file", cleanOriginal, cleanDiff);
  return { success: true, result: cleanDiff, message: "Applied code to file", method: "full", gitPatch };
}

/**
 * Clean a relative file path (removes leading ./ or ` or quotes).
 */
export function normalizeFilePath(p: string): string {
  return p
    .trim()
    .replace(/^[`"']+|[`"']+$/g, "")
    .replace(/^\.\//, "")
    .replace(/^([a-zA-Z]:)?[\\\/]/, "");
}

/**
 * Check if a text is a diff format.
 */
export function isDiffContent(code: string, lang?: string): boolean {
  if (!code) return false;
  if (lang === "diff" || lang === "patch") return true;
  return (
    /<{3,7}\s*SEARCH/i.test(code) ||
    (code.includes("@@") && (code.includes("---") || code.includes("+++"))) ||
    (/^[-+]\s+/m.test(code) && (code.includes("\n-") || code.includes("\n+")))
  );
}

/**
 * Parse an assistant message that may contain multiple code blocks and files.
 * Consolidates all hunks per file into exactly 1 entry.
 */
export function parseMultiFileAgentResponse(
  content: string,
  defaultFile?: string,
  existingFiles: Record<string, string> = {}
): {
  files: ParsedFileChange[];
  explanation: string;
  hasCode: boolean;
} {
  return parseConsolidatedFileDiffs(content, defaultFile, existingFiles);
}

/**
 * Parse an assistant message into:
 * 1. A clean, plain English explanation (with all file diff code blocks extracted)
 * 2. Exactly ONE consolidated diff card per file (merging multiple hunks for the same file)
 */
export function parseConsolidatedFileDiffs(
  content: string,
  defaultFile?: string,
  existingFiles: Record<string, string> = {}
): {
  files: ParsedFileChange[];
  explanation: string;
  hasCode: boolean;
} {
  const isPlanFile = (p?: string | null) =>
    Boolean(
      p &&
        (p.includes(".yuvro-developer/plan/") ||
          p.includes("/plan/") ||
          p.startsWith("plan-") ||
          (p.endsWith(".md") && p.includes("plan")))
    );

  const cleanDefaultFile = isPlanFile(defaultFile) ? undefined : defaultFile;
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?(?:\s+(?:file|filename|title)=["']?([^"'\s]+)["']?)?\s*([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  const matches: { lang: string; explicitFile?: string; code: string; index: number; fullMatch: string }[] = [];

  while ((match = codeBlockRegex.exec(content)) !== null) {
    matches.push({
      lang: match[1] || "",
      explicitFile: match[2],
      code: match[3] || "",
      index: match.index,
      fullMatch: match[0],
    });
  }

  if (matches.length === 0) {
    return {
      files: [],
      explanation: content.trim(),
      hasCode: false,
    };
  }

  const fileMap = new Map<string, ParsedFileChange>();
  const blocksToStrip: string[] = [];

  matches.forEach((m, i) => {
    const rawCode = m.code.trim();
    if (!rawCode) return;

    // Detect non-file command blocks (e.g., pure bash commands like `pip install ...`, `npm test`)
    const isShellLang = ["bash", "sh", "shell", "zsh", "cmd"].includes((m.lang || "").toLowerCase());
    const isPureCommand = isShellLang && !rawCode.includes("<<<<<<<") && !rawCode.includes("--- a/") && !rawCode.includes("+++ b/");
    if (isPureCommand && !m.explicitFile) {
      // Keep pure shell commands in markdown explanation
      return;
    }

    // Filter out trivial blocks (e.g. just a filename)
    if (
      rawCode.split("\n").length <= 2 &&
      (rawCode.endsWith(".py") ||
        rawCode.endsWith(".js") ||
        rawCode.endsWith(".ts") ||
        rawCode.endsWith(".html") ||
        rawCode.endsWith(".json") ||
        rawCode.endsWith(".md"))
    ) {
      if (rawCode.length < 50 && !rawCode.includes("import") && !rawCode.includes("def ") && !rawCode.includes("class ")) {
        return;
      }
    }

    let filePath: string | null = m.explicitFile ? normalizeFilePath(m.explicitFile) : null;

    if (!filePath) {
      const headerFileMatch = /^(?:#|\/\/|--|\/\*)\s*(?:File|filename|Path):\s*([^\s\n*]+)/im.exec(rawCode);
      if (headerFileMatch && headerFileMatch[1]) {
        filePath = normalizeFilePath(headerFileMatch[1]);
      }
    }

    if (!filePath && (rawCode.includes("--- a/") || rawCode.includes("+++ b/"))) {
      const diffHeaderMatch = /(?:---|\\+\\+\\+)\s+[ab]\/([^\s\n]+)/.exec(rawCode);
      if (diffHeaderMatch && diffHeaderMatch[1]) {
        filePath = normalizeFilePath(diffHeaderMatch[1]);
      }
    }

    if (!filePath) {
      const prevText = content.slice(Math.max(0, m.index - 250), m.index);
      const fileMarkers = [
        /(?:File|Updated file|Path|Filename):\s*[`"']?([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)[`"']?/i,
        /###\s*[`"']?([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)[`"']?/i,
        /\*\*([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)\*\*/i,
        /`([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+)`/i,
      ];

      for (const rx of fileMarkers) {
        const markerMatch = prevText.match(rx);
        if (markerMatch && markerMatch[1]) {
          const cand = normalizeFilePath(markerMatch[1]);
          if (cand.includes(".") && !cand.includes(" ") && cand.length > 2) {
            filePath = cand;
            break;
          }
        }
      }
    }

    // Heuristics for System Design Studio artifacts when filename is omitted
    if (!filePath) {
      const langLower = (m.lang || "").toLowerCase();
      if (langLower === "mermaid" || rawCode.startsWith("sequenceDiagram")) {
        filePath = "sequence_diagram.mmd";
      } else if (langLower === "dbml" || rawCode.includes("Table ") || rawCode.includes("Ref:")) {
        filePath = "db_schema.dbml";
      } else if (langLower === "json" || rawCode.startsWith("{") || rawCode.startsWith("[")) {
        if (rawCode.includes('"nodes"') || rawCode.includes('"edges"')) {
          filePath = "high_level_design.json";
        } else if (rawCode.includes('"method"') || rawCode.includes('"path"') || rawCode.includes('"endpoints"')) {
          filePath = "rest_api.json";
        }
      }
    }

    if (!filePath) {
      if (cleanDefaultFile) {
        filePath = normalizeFilePath(cleanDefaultFile);
      } else {
        const firstExisting = Object.keys(existingFiles).find((f) => !isPlanFile(f) && !f.endsWith(".md"));
        if (firstExisting) {
          filePath = normalizeFilePath(firstExisting);
        } else {
          filePath = `file_${fileMap.size + 1}.${m.lang || "txt"}`;
        }
      }
    }

    if (isPlanFile(filePath)) {
      return;
    }

    const cleanPath = normalizeFilePath(filePath);
    const resolvedPath =
      Object.keys(existingFiles).find(
        (k) => k === cleanPath || normalizeFilePath(k) === cleanPath || k.endsWith("/" + cleanPath)
      ) || cleanPath;

    const isDiff = isDiffContent(rawCode, m.lang);
    blocksToStrip.push(m.fullMatch);

    const origContent = existingFiles[resolvedPath];
    let computedGitPatch: string | undefined;
    if (origContent !== undefined) {
      const patchRes = applyDiffOrCode(origContent, rawCode, resolvedPath);
      if (patchRes.success && patchRes.gitPatch) {
        computedGitPatch = patchRes.gitPatch;
      }
    }

    // CONSOLIDATE: exactly 1 entry per file!
    if (fileMap.has(resolvedPath)) {
      const existing = fileMap.get(resolvedPath)!;
      existing.code = `${existing.code}\n\n${rawCode}`;
      existing.hunkCount = (existing.hunkCount || 1) + 1;
      if (isDiff) existing.isDiff = true;
      if (origContent !== undefined) {
        const patchRes = applyDiffOrCode(origContent, existing.code, resolvedPath);
        if (patchRes.success && patchRes.gitPatch) {
          existing.gitPatch = patchRes.gitPatch;
        }
      }
    } else {
      const exists = resolvedPath in existingFiles;
      fileMap.set(resolvedPath, {
        path: resolvedPath,
        code: rawCode,
        language: m.lang || "text",
        isDiff,
        hunkCount: 1,
        status: exists ? "modified" : "new",
        gitPatch: computedGitPatch,
      });
    }
  });

  const files = Array.from(fileMap.values());

  // Extract explanation: strip the code blocks that were consolidated
  let explanation = content;
  for (const block of blocksToStrip) {
    explanation = explanation.replace(block, "");
  }
  explanation = explanation.trim();

  // Strip common AI filler
  explanation = explanation
    .replace(/^#+\s+.*$/gm, "")
    .replace(/^Hello\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Hi\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Okay,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Sure,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/^Certainly,?\s+[^,!\n]+[,!]\s*/i, "")
    .replace(/Here'?s the code you'?ll need for.*$/im, "")
    .replace(/Here is the (?:solution|diff|code|patch).*$/im, "")
    .replace(/Below is the (?:solution|diff|code|patch).*$/im, "")
    .trim();

  if (!explanation) {
    if (files.length === 1) {
      explanation = `Updated ${files[0].path} with changes.`;
    } else if (files.length > 1) {
      explanation = `Updated ${files.length} files (${files.map((f) => f.path).join(", ")}).`;
    } else {
      explanation = "No code changes generated.";
    }
  }

  return {
    files,
    explanation,
    hasCode: files.length > 0,
  };
}
