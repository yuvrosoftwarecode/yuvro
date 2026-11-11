export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionStats {
  total: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculates total contributions, active days, current streak, and longest streak.
 * Pure function suitable for comprehensive unit testing.
 *
 * @param days Array of contribution days, expected sorted or will be sorted by date ascending.
 * @param referenceDate Optional YYYY-MM-DD string to anchor "current" streak (defaults to today or last recorded day).
 */
export function calculateStreaksAndTotals(
  days: ContributionDay[],
  referenceDate?: string
): ContributionStats {
  if (!days || days.length === 0) {
    return {
      total: 0,
      activeDays: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  // Sort chronologically ascending
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let total = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    total += day.count;

    if (day.count > 0) {
      activeDays += 1;
      runningStreak += 1;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  // Calculate current streak
  // Working backwards from the reference date (or latest date in array)
  let currentStreak = 0;
  const refIndex = referenceDate
    ? sorted.findIndex((d) => d.date === referenceDate)
    : sorted.length - 1;

  const startIndex = refIndex >= 0 ? refIndex : sorted.length - 1;

  // If today has 0, check if yesterday was active to continue streak
  let checkIdx = startIndex;
  if (sorted[checkIdx] && sorted[checkIdx].count === 0 && checkIdx > 0) {
    checkIdx -= 1;
  }

  while (checkIdx >= 0 && sorted[checkIdx].count > 0) {
    currentStreak += 1;
    checkIdx -= 1;
  }

  return {
    total,
    activeDays,
    currentStreak,
    longestStreak,
  };
}

/**
 * Determines color level (0 to 4) based on contribution count.
 */
export function getContributionLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Generates 53 weeks of 7 days (371 days) ending at an anchor date using real event dates.
 * Event dates can be ISO strings (e.g. "2026-11-10T14:32:00Z") or date strings ("2026-11-10").
 */
export function generateContributionYearFromEvents(
  eventDates: (string | Date | undefined | null)[],
  anchorDate: Date = new Date()
): ContributionDay[] {
  const countMap: Record<string, number> = {};

  for (const item of eventDates) {
    if (!item) continue;
    let dStr: string | null = null;
    if (typeof item === "string") {
      dStr = item.slice(0, 10);
    } else if (item instanceof Date && !isNaN(item.getTime())) {
      dStr = item.toISOString().slice(0, 10);
    }
    if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      countMap[dStr] = (countMap[dStr] || 0) + 1;
    }
  }

  const result: ContributionDay[] = [];
  const totalDays = 53 * 7; // 371 days

  const startDate = new Date(anchorDate);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = countMap[dateStr] || 0;

    result.push({
      date: dateStr,
      count,
      level: getContributionLevel(count),
    });
  }

  return result;
}

/**
 * Generates 53 weeks of 7 days (371 days) ending at an anchor date.
 */
export function generateMockContributionYear(anchorDate: Date = new Date(2026, 10, 11)): ContributionDay[] {
  const result: ContributionDay[] = [];
  const totalDays = 53 * 7; // 371 days

  // Align so the last day is anchorDate
  const startDate = new Date(anchorDate);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  // Seeded deterministic pseudorandom pattern
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const r = pseudoRandom();
    let count = 0;

    // Simulate developer activity pattern: active on weekdays, occasional on weekends, with a solid current streak
    const isNearEnd = i > totalDays - 25; // active 24-day current streak
    if (isNearEnd) {
      count = Math.floor(pseudoRandom() * 8) + 1;
    } else if (isWeekend) {
      count = r > 0.65 ? Math.floor(r * 4) : 0;
    } else {
      count = r > 0.28 ? Math.floor(r * 11) : 0;
    }

    result.push({
      date: dateStr,
      count,
      level: getContributionLevel(count),
    });
  }

  return result;
}

export interface HeatmapColumn {
  weekIndex: number;
  monthLabel?: string;
  days: ContributionDay[];
}

/**
 * Groups days into 53 columns with 7 days each, plus month labels.
 */
export function groupIntoWeeks(days: ContributionDay[]): HeatmapColumn[] {
  const columns: HeatmapColumn[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let lastSeenMonth = -1;

  for (let w = 0; w < 53; w++) {
    const weekDays = days.slice(w * 7, (w + 1) * 7);
    let monthLabel: string | undefined;

    // Check if a new month starts in this column
    for (const day of weekDays) {
      if (day) {
        const month = parseInt(day.date.substring(5, 7), 10) - 1;
        if (month !== lastSeenMonth) {
          lastSeenMonth = month;
          monthLabel = monthNames[month];
          break;
        }
      }
    }

    columns.push({
      weekIndex: w,
      monthLabel,
      days: weekDays,
    });
  }

  return columns;
}
