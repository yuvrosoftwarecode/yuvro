import { restApiAuthUtil } from "../utils/RestApiAuthUtil";

export const principalService = {
  getFacultyStats: async (collegeId: string) => {
    return await restApiAuthUtil.get(`/course/colleges/${collegeId}/faculty_stats/`);
  },
  getPRIReport: async (collegeId: string) => {
    return await restApiAuthUtil.get(`/course/colleges/${collegeId}/pri_report/`);
  },
};
