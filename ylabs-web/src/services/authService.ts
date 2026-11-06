import type { User } from "../lib/auth";
import { restApiAuthUtil, yhubApiAuthUtil, ycodeApiAuthUtil } from "../utils/RestApiAuthUtil";
import { restApiUtil } from "../utils/RestApiUtil";

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  roles?: Record<string, string>;
}

class AuthService {
  setAuthToken(token: string, refreshToken?: string): void {
    if (refreshToken) {
      localStorage.setItem("refresh", refreshToken);
    }
    restApiAuthUtil.setAuthToken(token, refreshToken);
    yhubApiAuthUtil.setAuthToken(token, refreshToken);
    ycodeApiAuthUtil.setAuthToken(token, refreshToken);
  }

  isAuthenticated(): boolean {
    return restApiAuthUtil.isAuthenticated();
  }

  getAuthToken(): string | null {
    return restApiAuthUtil.getAuthToken();
  }

  async refreshToken(): Promise<boolean> {
    return yhubApiAuthUtil.forceRefreshToken();
  }

  initializeFromStorage(): void {
    const token = localStorage.getItem("access");
    if (token) {
      restApiAuthUtil.setAuthToken(token);
      yhubApiAuthUtil.setAuthToken(token);
      ycodeApiAuthUtil.setAuthToken(token);
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>("/auth/login/?product=ylabs", {
      email,
      password,
    });

    localStorage.setItem("access", response.access);
    localStorage.setItem("refresh", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);
    ycodeApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>(
      "/auth/register/?product=ylabs",
      data,
    );

    localStorage.setItem("access", response.access);
    localStorage.setItem("refresh", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);
    ycodeApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async fetchCompanies(): Promise<any[]> {
    return await restApiUtil.get<any[]>("/recruiter/companies/");
  }

  async registerRecruiter(data: any): Promise<LoginResponse> {
    const response = await restApiUtil.post<LoginResponse>(
      "/recruiter/register/",
      data,
    );

    localStorage.setItem("access", response.access);
    localStorage.setItem("refresh", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);
    ycodeApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async sendRegistrationOtp(email: string, title: string = "Recruiter Registration"): Promise<any> {
    return await yhubApiAuthUtil.post(`/auth/public_send_otp/`, {
      email,
      resource_id: "recruiter_signup",
      resource_type: "signup",
      contest_title: title,
    });
  }

  async sendSignupOtp(email: string, title: string = "Student Registration"): Promise<any> {
    return await yhubApiAuthUtil.post(`/auth/public_send_otp/`, {
      email: email.trim(),
      resource_id: "student_signup",
      resource_type: "signup",
      contest_title: title,
    });
  }

  async verifySignupOtp(email: string, otp: string): Promise<any> {
    return await yhubApiAuthUtil.post(`/auth/public_check_otp/`, {
      email: email.trim(),
      resource_id: "student_signup",
      resource_type: "signup",
      otp: otp.trim(),
    });
  }

  async loginWithGoogle(token: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>("/auth/google/?product=ylabs", {
      token,
    });

    localStorage.setItem("access", response.access);
    localStorage.setItem("refresh", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);
    ycodeApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async getCurrentUser(): Promise<User> {
    // Fetch from YHub so profile_image / cover_image are always present
    return await yhubApiAuthUtil.get<User>("/auth/user/");
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    return await yhubApiAuthUtil.put<User>("/auth/user/", userData);
  }

  async uploadProfileImage(
    file: File,
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("field", field);
    return await yhubApiAuthUtil.post<User>("/auth/profile/upload-image/", formData);
  }

  async uploadResume(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("field", "resume_file");
    return await yhubApiAuthUtil.post<User>("/auth/profile/upload-image/", formData);
  }

  async removeProfileImage(
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    return await yhubApiAuthUtil.post<User>("/auth/profile/remove-image/", { field });
  }

  async removeResume(): Promise<User> {
    return await yhubApiAuthUtil.post<User>("/auth/profile/remove-image/", { field: "resume_file" });
  }

  async logoutUser(): Promise<void> {
    const refreshToken = localStorage.getItem("refresh");
    const sessionId = localStorage.getItem("yuvro_session_id");
    try {
      if (refreshToken || sessionId) {
        await yhubApiAuthUtil.post("/auth/logout/", {
          refresh: refreshToken,
          session_id: sessionId,
        });
      }
    } catch (e) {
      console.warn("Logout error:", e);
    }
    localStorage.removeItem("yuvro_session_id");
    restApiAuthUtil.clearAuthToken();
    yhubApiAuthUtil.clearAuthToken();
    ycodeApiAuthUtil.clearAuthToken();
    window.location.href = "/auth?tab=signin";
  }

  async healthCheck(): Promise<{ status: string }> {
    return await restApiAuthUtil.get<{ status: string }>("/health/");
  }

  async forgotPassword(email: string): Promise<any> {
    return await yhubApiAuthUtil.post("/auth/forgot-password/", { email });
  }

  async resetPassword(uidb64: string, token: string, password: string): Promise<any> {
    return await yhubApiAuthUtil.post(`/auth/reset-password/${uidb64}/${token}/`, { password });
  }

  async sendChangePasswordOtp(): Promise<{ status: string; message: string }> {
    return await yhubApiAuthUtil.post<{ status: string; message: string }>(
      "/auth/change-password/send-otp/",
      {},
    );
  }

  async changePassword(options: {
    currentPassword?: string;
    otp?: string;
    newPassword: string;
  }): Promise<any> {
    return await yhubApiAuthUtil.post("/auth/change-password/", {
      current_password: options.currentPassword,
      otp: options.otp,
      new_password: options.newPassword,
    });
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    return await yhubApiAuthUtil.get<ActiveSession[]>("/auth/sessions/");
  }

  async revokeSession(sessionId: string): Promise<any> {
    try {
      return await yhubApiAuthUtil.post(`/auth/sessions/${sessionId}/logout/`, {});
    } catch {
      return await yhubApiAuthUtil.delete(`/auth/sessions/${sessionId}/logout/`);
    }
  }

  async revokeAllOtherSessions(): Promise<any> {
    return await yhubApiAuthUtil.post("/auth/sessions/logout-all/", {});
  }
}

export interface ActiveSession {
  id: string;
  browser: string;
  os: string;
  device_type: string;
  location: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

export const authService = new AuthService();
export default authService;
