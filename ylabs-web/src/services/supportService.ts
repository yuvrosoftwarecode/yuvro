import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface SupportFeedbackPayload {
  subject: string;
  description: string;
  email?: string;
  name?: string;
  page_url?: string;
}

export interface SupportFeedbackResponse {
  status: string;
  message: string;
}

/**
 * Submits user improvement suggestions and feedback to support@yuvrolabs.com.
 */
export async function submitSupportFeedback(
  payload: SupportFeedbackPayload
): Promise<SupportFeedbackResponse> {
  const body = {
    ...payload,
    page_url:
      payload.page_url || (typeof window !== "undefined" ? window.location.href : ""),
  };

  try {
    return await yhubApiAuthUtil.post<SupportFeedbackResponse>(
      "/support/feedback/",
      body
    );
  } catch (err: any) {
    // Retry with /feedback/ endpoint if /support/feedback/ fails
    try {
      return await yhubApiAuthUtil.post<SupportFeedbackResponse>("/feedback/", body);
    } catch {
      throw err;
    }
  }
}
