import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export interface StudentStats {
  day_streak: number;
  total_yp: number;
  rank: number;
}

export async function loadStudentStats(): Promise<StudentStats> {
  return await restApiAuthUtil.get<StudentStats>("/lab/stats/");
}
