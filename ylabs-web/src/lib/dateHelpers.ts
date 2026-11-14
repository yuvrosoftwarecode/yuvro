const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Formats a YYYY-MM string to "MMM YYYY" (e.g. "2025-06" -> "Jun 2025")
 */
export function formatMonthYear(ym?: string): string {
  if (!ym) return "";
  const parts = ym.split("-");
  if (parts.length < 2) return ym;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || parts[1];

  return `${monthName} ${year}`;
}

/**
 * Formats a month range, respecting current/ongoing
 */
export function formatMonthRange(
  from?: string,
  to?: string,
  current: boolean = false
): string {
  if (!from && !to && !current) return "";
  const fromStr = formatMonthYear(from);

  if (current) {
    return fromStr ? `${fromStr} - Present` : "Present";
  }

  const toStr = formatMonthYear(to);
  if (fromStr && toStr) {
    return `${fromStr} - ${toStr}`;
  }
  return fromStr || toStr || "";
}

/**
 * Compares two YYYY-MM strings.
 * Returns true if from <= to, or if to is omitted/empty.
 */
export function isValidMonthRange(from?: string, to?: string): boolean {
  if (!from || !to) return true;
  return from <= to;
}

/**
 * Formats an ISO date string to a human-readable relative time string.
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return "just now";
  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Formats bytes to human-readable size (e.g. "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
