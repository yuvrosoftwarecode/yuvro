/**
 * Utilities for diff parsing, code block extraction, and patch application.
 * Supports Search/Replace blocks, unified diffs, and multi-file agent output.
 */

export interface ParsedFileChange {
  path: string;
  code: string;
  language?: string;
  isDiff: boolean;
  status: "modified" | "new";
}

/**
 * Apply Search/Replace block, Unified diff, or full code to an existing file string.
 */
export function applyDiffOrCode(
  original: string,
  diffOrCode: string
): { success: boolean; result: string; message: string; method: "search-replace" | "unified" | "full" } {
  if (!original) {
    return { success: true, result: diffOrCode, message: "Created file content", method: "full" };
  }

  // 1. Check for SEARCH / REPLACE blocks
  // e.g.:
  // <<<<<<< SEARCH
  // old code
  // =======
  // new code
  // >>>>>>> REPLACE
  const searchReplaceRegex = /<{3,7}\s*SEARCH\s*\n([\s\S]*?)\n={3,7}\s*\n([\s\S]*?)\n>{3,7}\s*(?:REPLACE)?/gi;
  const matches = [...diffOrCode.matchAll(searchReplaceRegex)];

  if (matches.length > 0) {
    let current = original;
    let appliedCount = 0;

    for (const match of matches) {
      const searchBlock = match[1];
      const replaceBlock = match[2];

      // Exact substring match
      if (current.includes(searchBlock)) {
        current = current.replace(searchBlock, replaceBlock);
        appliedCount++;
        continue;
      }

      // Whitespace-trimmed line-by-line match
      const searchLines = searchBlock.split("\n").map((l) => l.trimEnd());
      const currentLines = current.split("\n");
      let foundIdx = -1;

      for (let i = 0; i <= currentLines.length - searchLines.length; i++) {
        let allMatch = true;
        for (let j = 0; j < searchLines.length; j++) {
          if (currentLines[i + j].trimEnd() !== searchLines[j]) {
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
        const replaceLines = replaceBlock.split("\n");
        currentLines.splice(foundIdx, searchLines.length, ...replaceLines);
        current = currentLines.join("\n");
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      return {
        success: true,
        result: current,
        message: `Applied ${appliedCount} diff hunk(s)`,
        method: "search-replace",
      };
    }
  }

  // 2. Check for Unified Diff format (--- / +++ / @@)
  if (diffOrCode.includes("@@") && (diffOrCode.includes("---") || diffOrCode.includes("+++"))) {
    const hunkRegex = /@@\s*-\d+(?:,\d+)?\s*\+\d+(?:,\d+)?\s*@@[^\n]*\n([\s\S]*?)(?=(?:@@|$))/g;
    const hunks = [...diffOrCode.matchAll(hunkRegex)];
    if (hunks.length > 0) {
      let current = original;
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
        return {
          success: true,
          result: current,
          message: `Applied ${appliedHunks} unified diff hunk(s)`,
          method: "unified",
        };
      }
    }
  }

  // 3. Fallback: Full replacement of file
  return { success: true, result: diffOrCode, message: "Applied code to file", method: "full" };
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
export function isDiffContent(code: string): boolean {
  return (
    /<{3,7}\s*SEARCH/i.test(code) ||
    (code.includes("@@") && (code.includes("---") || code.includes("+++")))
  );
}

/**
 * Parse an assistant message that may contain multiple code blocks and files.
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
  const files: ParsedFileChange[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?(?:\s+(?:file|filename|title)=["']?([^"'\s]+)["']?)?\s*([\s\S]*?)```/g;

  // We find all code blocks and inspect their immediate context for file names
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

  const seenPaths = new Set<string>();

  matches.forEach((m, i) => {
    const rawCode = m.code.trim();
    if (!rawCode) return;

    // Filter out trivial blocks that are just a filename (e.g. ```text\nmain.py\n```)
    if (rawCode.split("\n").length <= 2 && (rawCode.endsWith(".py") || rawCode.endsWith(".js") || rawCode.endsWith(".ts") || rawCode.endsWith(".html") || rawCode.endsWith(".json") || rawCode.endsWith(".md"))) {
      if (rawCode.length < 50 && !rawCode.includes("import") && !rawCode.includes("def ") && !rawCode.includes("class ")) {
        return;
      }
    }

    let filePath: string | null = m.explicitFile ? normalizeFilePath(m.explicitFile) : null;

    if (!filePath) {
      // Look at the text immediately preceding this code block (up to 200 chars)
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
          // Validate it looks like a reasonable file name
          if (cand.includes(".") && !cand.includes(" ") && cand.length > 2) {
            filePath = cand;
            break;
          }
        }
      }
    }

    // If still not found and this is the only code block or defaultFile is specified:
    if (!filePath) {
      if (matches.length === 1 && defaultFile) {
        filePath = normalizeFilePath(defaultFile);
      } else if (!seenPaths.has(defaultFile || "main.py")) {
        filePath = normalizeFilePath(defaultFile || "main.py");
      } else {
        filePath = `file_${i + 1}.${m.lang || "txt"}`;
      }
    }

    seenPaths.add(filePath);
    const isDiff = isDiffContent(rawCode);
    const exists = filePath in existingFiles;

    files.push({
      path: filePath,
      code: rawCode,
      language: m.lang || "text",
      isDiff,
      status: exists ? "modified" : "new",
    });
  });

  // Extract clean explanation text
  let explanation = content.replace(codeBlockRegex, "").trim();

  // Strip common AI filler
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
