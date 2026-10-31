import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export interface StudentStats {
  day_streak: number;
  total_yp: number;
  rank: number;
}

let inFlightStudentStats: Promise<StudentStats> | null = null;
let cachedStudentStats: { data: StudentStats; timestamp: number } | null = null;
const STATS_CACHE_TTL = 10000;

export async function loadStudentStats(forceRefresh: boolean = false): Promise<StudentStats> {
  const now = Date.now();
  if (!forceRefresh && cachedStudentStats && now - cachedStudentStats.timestamp < STATS_CACHE_TTL) {
    return cachedStudentStats.data;
  }
  if (!forceRefresh && inFlightStudentStats) {
    return inFlightStudentStats;
  }

  inFlightStudentStats = restApiAuthUtil
    .get<StudentStats>("/lab/stats/")
    .then((data) => {
      cachedStudentStats = { data, timestamp: Date.now() };
      return data;
    })
    .finally(() => {
      inFlightStudentStats = null;
    });

  return inFlightStudentStats;
}

export function invalidateStudentStats() {
  cachedStudentStats = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yuvro-stats-refresh"));
  }
}
