import { yhubApiAuthUtil } from "../utils/RestApiAuthUtil";

export interface ReferralCodeResponse {
  code: string;
  link: string;
  message: string;
  created_at: string;
}

export interface StudentReferralStats {
  total_referrals: number;
  accepted_referrals: number;
  pending_referrals: number;
}

export interface ReferralHistoryItem {
  id: string;
  referred_name: string;
  registration_date: string;
  status: string;
}

export interface ReferralHistoryResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ReferralHistoryItem[];
}

export interface ValidateReferralResponse {
  valid: boolean;
  message: string;
  referrer_name?: string;
  code?: string;
}

export interface AdminReferralSummary {
  total_referrals: number;
  total_accepted: number;
  total_pending: number;
  total_referring_students: number;
}

export interface AdminReferrerItem {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  total_referred: number;
  accepted: number;
  pending: number;
}

export interface AdminReferrersResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: AdminReferrerItem[];
}

export interface AdminReferralDetailItem {
  id: string;
  referred_name: string;
  referred_email: string;
  registration_date: string;
  status: string;
  referral_code: string;
}

export interface AdminReferrerDetails {
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
  referral_code: string;
  referrals: AdminReferralDetailItem[];
}

class ReferralService {
  async getMyReferralCode(): Promise<ReferralCodeResponse> {
    return yhubApiAuthUtil.get<ReferralCodeResponse>("/referrals/my-code/");
  }

  async generateMyReferralCode(force: boolean = false): Promise<ReferralCodeResponse> {
    return yhubApiAuthUtil.post<ReferralCodeResponse>("/referrals/my-code/", { force });
  }

  async adminGenerateReferralCode(payload: { user_id?: string; email?: string }): Promise<any> {
    return yhubApiAuthUtil.post<any>("/referrals/admin/generate/", payload);
  }

  async validateReferralCode(code: string): Promise<ValidateReferralResponse> {
    try {
      return await yhubApiAuthUtil.get<ValidateReferralResponse>(
        `/referrals/validate/?code=${encodeURIComponent(code)}`
      );
    } catch (err: any) {
      return {
        valid: false,
        message: err?.response?.data?.message || "Invalid referral code",
      };
    }
  }

  async getMyStats(): Promise<StudentReferralStats> {
    return yhubApiAuthUtil.get<StudentReferralStats>("/referrals/my-stats/");
  }

  async getMyHistory(page: number = 1, pageSize: number = 10): Promise<ReferralHistoryResponse> {
    return yhubApiAuthUtil.get<ReferralHistoryResponse>(
      `/referrals/my-history/?page=${page}&page_size=${pageSize}`
    );
  }

  async getAdminSummary(): Promise<AdminReferralSummary> {
    return yhubApiAuthUtil.get<AdminReferralSummary>("/referrals/admin/summary/");
  }

  async getAdminStudents(
    page: number = 1,
    pageSize: number = 10,
    search: string = "",
    status: string = ""
  ): Promise<AdminReferrersResponse> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (search) params.set("search", search);
    if (status && status.toLowerCase() !== "all") params.set("status", status);

    return yhubApiAuthUtil.get<AdminReferrersResponse>(`/referrals/admin/students/?${params.toString()}`);
  }

  async getAdminStudentDetails(userId: string): Promise<AdminReferrerDetails> {
    return yhubApiAuthUtil.get<AdminReferrerDetails>(`/referrals/admin/students/${userId}/`);
  }
}

export const referralService = new ReferralService();
export default referralService;
