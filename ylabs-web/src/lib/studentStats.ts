import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export interface StudentStats {
  day_streak: number;
  total_yp: number;
  rank: number;
  activity_dates?: string[];
}

let inFlightStudentStats: Promise<StudentStats> | null = null;
let cachedStudentStats: { data: StudentStats; timestamp: number } | null = null;
let globalStudentStats: StudentStats | null = null;
const statsListeners = new Set<(s: StudentStats) => void>();
const STATS_CACHE_TTL = 10000;

export function getCachedStudentStats(): StudentStats | null {
  return globalStudentStats || cachedStudentStats?.data || null;
}

export function subscribeStudentStats(cb: (s: StudentStats) => void): () => void {
  statsListeners.add(cb);
  if (globalStudentStats) {
    cb(globalStudentStats);
  }
  return () => {
    statsListeners.delete(cb);
  };
}

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
      globalStudentStats = data;
      statsListeners.forEach((fn) => {
        try {
          fn(data);
        } catch {}
      });
      return data;
    })
    .finally(() => {
      inFlightStudentStats = null;
    });

  return inFlightStudentStats;
}

export function invalidateStudentStats() {
  cachedStudentStats = null;
  // Trigger immediate load
  loadStudentStats(true).catch(() => {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yuvro-stats-refresh"));

    // Follow-up refreshes in case the backend DB transaction for score/YP has a brief commit latency
    setTimeout(() => {
      loadStudentStats(true).catch(() => {});
    }, 1200);

    setTimeout(() => {
      loadStudentStats(true).catch(() => {});
    }, 2800);
  }
}
