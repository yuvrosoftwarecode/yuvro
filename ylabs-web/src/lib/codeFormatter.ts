/**
 * Comprehensive multi-language code formatter for the web IDE.
 * Formats Python, JavaScript/TypeScript, Java, C/C++, SQL, JSON, HTML, and CSS.
 */

export function formatSourceCode(
  source: string,
  language: string,
  _filename?: string
): { formatted: string; changed: boolean } {
  if (!source || !source.trim()) {
    return { formatted: source, changed: false };
  }

  const lang = (language || "").toLowerCase().trim();

  try {
    let result = source;

    if (lang === "json") {
      result = formatJson(source);
    } else if (lang === "python" || lang === "py") {
      result = formatPython(source);
    } else if (lang === "javascript" || lang === "js" || lang === "typescript" || lang === "ts" || lang === "jsx" || lang === "tsx") {
      result = formatJavaScript(source);
    } else if (lang === "java") {
      result = formatCStyle(source, "java");
    } else if (lang === "c" || lang === "cpp" || lang === "c++") {
      result = formatCStyle(source, "cpp");
    } else if (lang === "sql") {
      result = formatSql(source);
    } else if (lang === "html" || lang === "xml") {
      result = formatHtml(source);
    } else if (lang === "css" || lang === "scss") {
      result = formatCss(source);
    } else {
      // Generic indentation beautifier
      result = formatGeneric(source);
    }

    // Ensure ending with single newline
    if (result && !result.endsWith("\n")) {
      result += "\n";
    }

    return {
      formatted: result,
      changed: result !== source,
    };
  } catch (err) {
    console.warn("Formatter fallback:", err);
    return { formatted: source, changed: false };
  }
}

/**
 * Format JSON
 */
function formatJson(code: string): string {
  const parsed = JSON.parse(code);
  return JSON.stringify(parsed, null, 2);
}

/**
 * Format Python with strict 4-space PEP 8 indentation rules
 */
function formatPython(code: string): string {
  const lines = code.split("\n");
  const formattedLines: string[] = [];
  let currentIndent = 0;
  const indentStep = 4;
  let inMultilineString = false;
  let multilineQuote = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for multiline string quotes (''' or """)
    if (!inMultilineString) {
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        const quote = trimmed.substring(0, 3);
        const rest = trimmed.substring(3);
        if (!rest.includes(quote)) {
          inMultilineString = true;
          multilineQuote = quote;
        }
        formattedLines.push(" ".repeat(currentIndent) + trimmed);
        continue;
      }
    } else {
      if (trimmed.includes(multilineQuote)) {
        inMultilineString = false;
      }
      formattedLines.push(rawLine);
      continue;
    }

    // Preserve empty lines, but avoid more than 2 consecutive blank lines
    if (trimmed.length === 0) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
        if (formattedLines.length > 1 && formattedLines[formattedLines.length - 2] === "") {
          // Already have 2 blank lines, skip extra
          continue;
        }
      }
      formattedLines.push("");
      continue;
    }

    // Dedent triggers before printing line
    if (
      trimmed.startsWith("elif ") ||
      trimmed.startsWith("elif(") ||
      trimmed.startsWith("else:") ||
      trimmed.startsWith("except ") ||
      trimmed.startsWith("except:") ||
      trimmed.startsWith("finally:")
    ) {
      currentIndent = Math.max(0, currentIndent - indentStep);
    }

    // Format operators in expressions if not inside comments
    let formattedText = trimmed;
    if (!trimmed.startsWith("#")) {
      // Space after commas (not followed by space)
      formattedText = formattedText.replace(/,([^\s,])/g, ", $1");
      // Space around colons for dict keys / type annotations (not :: or :)
      formattedText = formattedText.replace(/([a-zA-Z0-9_'"])\s*:\s*([a-zA-Z0-9_'"])/g, "$1: $2");
    }

    // Append indented line
    formattedLines.push(" ".repeat(currentIndent) + formattedText);

    // Indent increase if line ends with colon (and not a comment)
    const lineWithoutComment = trimmed.split("#")[0].trim();
    if (lineWithoutComment.endsWith(":")) {
      currentIndent += indentStep;
    }

    // Dedent triggers after certain terminal statements if on block end
    if (
      lineWithoutComment === "pass" ||
      lineWithoutComment.startsWith("return ") ||
      lineWithoutComment === "return" ||
      lineWithoutComment === "break" ||
      lineWithoutComment === "continue" ||
      lineWithoutComment.startsWith("raise ") ||
      lineWithoutComment === "raise"
    ) {
      // Lookahead: if next non-empty line has lower or equal indent, adjust
      let nextNonEmpty: string | null = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().length > 0) {
          nextNonEmpty = lines[j].trim();
          break;
        }
      }
      if (nextNonEmpty) {
        if (
          nextNonEmpty.startsWith("elif") ||
          nextNonEmpty.startsWith("else:") ||
          nextNonEmpty.startsWith("except") ||
          nextNonEmpty.startsWith("finally:")
        ) {
          // Will be handled on next line
        } else if (
          nextNonEmpty.startsWith("def ") ||
          nextNonEmpty.startsWith("class ") ||
          nextNonEmpty.startsWith("@")
        ) {
          // Dedent back to base or previous level
          currentIndent = Math.max(0, currentIndent - indentStep);
        }
      }
    }
  }

  // Remove trailing blank lines
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
    formattedLines.pop();
  }

  return formattedLines.join("\n");
}

/**
 * Format C-Style languages (Java, C, C++)
 */
function formatCStyle(code: string, _flavor: "java" | "cpp"): string {
  const lines = code.split("\n");
  const formattedLines: string[] = [];
  let indent = 0;
  const indentStep = 4;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      formattedLines.push(" ".repeat(indent) + (trimmed.startsWith("*") ? " " + trimmed : trimmed));
      continue;
    }

    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      formattedLines.push(" ".repeat(indent) + trimmed);
      continue;
    }

    if (trimmed.length === 0) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
        continue;
      }
      formattedLines.push("");
      continue;
    }

    // Count braces on this line
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;

    // If starts with closing brace or case/default, decrease indent for this line
    const startsWithClose = trimmed.startsWith("}");
    const isSwitchCase = trimmed.startsWith("case ") || trimmed.startsWith("default:");

    let lineIndent = indent;
    if (startsWithClose) {
      lineIndent = Math.max(0, indent - indentStep);
    } else if (isSwitchCase) {
      lineIndent = Math.max(0, indent - (indentStep / 2));
    }

    // Format spacing around operators if not a comment
    let formattedText = trimmed;
    if (!trimmed.startsWith("//")) {
      formattedText = formattedText
        .replace(/,([^\s,])/g, ", $1")
        .replace(/;([^\s;])/g, "; $1")
        .replace(/\s*([=+\-*/%&|^<>!]=?)\s*/g, " $1 ")
        .replace(/\s*(&&|\|\|)\s*/g, " $1 ")
        .replace(/\s*([=+\-*/%&|^<>!])\s*/g, " $1 ")
        .replace(/\s+/g, " ")
        // Fix pointer and unary operators
        .replace(/(\+\+|--)\s*/g, "$1")
        .replace(/\s*(\+\+|--)/g, "$1")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\[\s+/g, "[")
        .replace(/\s+\]/g, "]")
        .replace(/\s*;\s*$/g, ";")
        .replace(/\s*\{\s*$/g, " {");
    }

    formattedLines.push(" ".repeat(Math.max(0, lineIndent)) + formattedText);

    // Update indent for subsequent lines
    indent = Math.max(0, indent + (openBraces - closeBraces) * indentStep);
  }

  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
    formattedLines.pop();
  }

  return formattedLines.join("\n");
}

/**
 * Format JavaScript / TypeScript
 */
function formatJavaScript(code: string): string {
  const lines = code.split("\n");
  const formattedLines: string[] = [];
  let indent = 0;
  const indentStep = 2;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      formattedLines.push(" ".repeat(indent) + (trimmed.startsWith("*") ? " " + trimmed : trimmed));
      continue;
    }

    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) {
        inBlockComment = true;
      }
      formattedLines.push(" ".repeat(indent) + trimmed);
      continue;
    }

    if (trimmed.length === 0) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
        continue;
      }
      formattedLines.push("");
      continue;
    }

    // Count bracket balance
    const openBraces = (trimmed.match(/[\{\[\(]/g) || []).length;
    const closeBraces = (trimmed.match(/[\}\]\)]/g) || []).length;

    const startsWithClose = trimmed.startsWith("}") || trimmed.startsWith("]") || trimmed.startsWith(")");
    let lineIndent = indent;
    if (startsWithClose) {
      lineIndent = Math.max(0, indent - indentStep);
    }

    let formattedText = trimmed;
    if (!trimmed.startsWith("//")) {
      formattedText = formattedText
        .replace(/,([^\s,])/g, ", $1")
        .replace(/;([^\s;])/g, "; $1")
        .replace(/\s*=>\s*/g, " => ")
        .replace(/\s*:\s*/g, ": ")
        .replace(/\s*;\s*$/g, ";")
        .replace(/\s*\{\s*$/g, " {");
    }

    formattedLines.push(" ".repeat(Math.max(0, lineIndent)) + formattedText);
    indent = Math.max(0, indent + (openBraces - closeBraces) * indentStep);
  }

  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
    formattedLines.pop();
  }

  return formattedLines.join("\n");
}

/**
 * Format SQL Queries
 */
function formatSql(code: string): string {
  const keywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
    "LIMIT", "OFFSET", "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN",
    "FULL JOIN", "CROSS JOIN", "ON", "INSERT INTO", "VALUES", "UPDATE",
    "SET", "DELETE FROM", "CREATE TABLE", "DROP TABLE", "ALTER TABLE",
    "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL",
    "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "UNION",
    "UNION ALL", "CASE", "WHEN", "THEN", "ELSE", "END", "DESC", "ASC"
  ];

  let sql = code.trim();

  // Keyword capitalization regex
  keywords.forEach((kw) => {
    const reg = new RegExp(`\\b${kw}\\b`, "gi");
    sql = sql.replace(reg, kw);
  });

  // Clause line breaks
  const majorClauses = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
    "LIMIT", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN",
    "JOIN", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM"
  ];

  majorClauses.forEach((clause) => {
    const reg = new RegExp(`\\s*\\b(${clause})\\b\\s*`, "g");
    sql = sql.replace(reg, `\n$1 `);
  });

  const lines = sql.split("\n").map(l => l.trim()).filter(Boolean);
  const formattedLines: string[] = [];

  for (const line of lines) {
    const isMajor = majorClauses.some(c => line.startsWith(c));
    if (isMajor) {
      formattedLines.push(line);
    } else {
      formattedLines.push("  " + line);
    }
  }

  return formattedLines.join("\n").trim();
}

/**
 * Format HTML
 */
function formatHtml(code: string): string {
  const tokens = code.replace(/>\s*</g, "><").split(/(<[^>]+>)/g).filter(Boolean);
  const formatted: string[] = [];
  let indent = 0;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 2);
      formatted.push(" ".repeat(indent) + trimmed);
    } else if (trimmed.startsWith("<") && !trimmed.startsWith("<!") && !trimmed.endsWith("/>")) {
      formatted.push(" ".repeat(indent) + trimmed);
      const tagMatch = trimmed.match(/^<([a-zA-Z0-9\-]+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : "";
      if (!voidTags.has(tagName)) {
        indent += 2;
      }
    } else {
      formatted.push(" ".repeat(indent) + trimmed);
    }
  }

  return formatted.join("\n");
}

/**
 * Format CSS
 */
function formatCss(code: string): string {
  let css = code.replace(/\s+/g, " ").trim();
  css = css.replace(/\{/g, " {\n  ").replace(/\}/g, "\n}\n").replace(/;\s*/g, ";\n  ");
  const lines = css.split("\n").map(l => l.trimRight()).filter(Boolean);
  return lines.join("\n");
}

/**
 * Generic indentation
 */
function formatGeneric(code: string): string {
  return code
    .split("\n")
    .map(line => line.trimRight())
    .join("\n")
    .trim();
}
