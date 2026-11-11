import type { User } from "../lib/auth";
import { restApiAuthUtil, yhubApiAuthUtil, ycodeApiAuthUtil } from "../utils/RestApiAuthUtil";
import { restApiUtil } from "../utils/RestApiUtil";

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface CheckUsernameResponse {
  available: boolean;
  message: string;
}

export interface CheckEmailResponse {
  available: boolean;
  message: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
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

  async checkUsername(username: string, signal?: AbortSignal): Promise<CheckUsernameResponse> {
    const encoded = encodeURIComponent(username.trim());
    return await yhubApiAuthUtil.get<CheckUsernameResponse>(
      `/auth/check-username/?username=${encoded}`,
      { signal }
    );
  }

  async checkEmail(email: string, signal?: AbortSignal): Promise<CheckEmailResponse> {
    const encoded = encodeURIComponent(email.trim());
    return await yhubApiAuthUtil.get<CheckEmailResponse>(
      `/auth/check-email/?email=${encoded}`,
      { signal }
    );
  }

  async fetchCompanies(): Promise<any[]> {
    return await restApiUtil.get<any[]>("/recruiter/companies/");
  }

  async registerRecruiter(data: any): Promise<LoginResponse> {
    const response = await restApiUtil.post<LoginResponse>("/recruiter/register/", data);

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

  private syncUser(user: User): User {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new CustomEvent("yuvro_auth_user_updated", { detail: user }));
      }
    } catch {}
    return user;
  }

  async getCurrentUser(): Promise<User> {
    // Fetch from YHub so profile_image / cover_image are always present
    const user = await yhubApiAuthUtil.get<User>("/auth/user/");
    return this.syncUser(user);
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    const user = await yhubApiAuthUtil.put<User>("/auth/user/", userData);
    return this.syncUser(user);
  }

  async uploadProfileImage(
    file: File,
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("field", field);
    const user = await yhubApiAuthUtil.post<User>("/auth/profile/upload-image/", formData);
    return this.syncUser(user);
  }

  async uploadResume(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("field", "resume_file");
    const user = await yhubApiAuthUtil.post<User>("/auth/profile/upload-image/", formData);
    return this.syncUser(user);
  }

  async removeProfileImage(
    field: "profile_image" | "cover_image" = "profile_image",
  ): Promise<User> {
    const user = await yhubApiAuthUtil.post<User>("/auth/profile/remove-image/", { field });
    return this.syncUser(user);
  }

  async removeResume(): Promise<User> {
    const user = await yhubApiAuthUtil.post<User>("/auth/profile/remove-image/", {
      field: "resume_file",
    });
    return this.syncUser(user);
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

  // TODO(backend): Implement POST /auth/phone/send-otp/ for SMS OTP dispatching
  async sendPhoneSignupOtp(
    phone: string,
    countryCode: string = "+91",
  ): Promise<{ message: string; cooldown?: number }> {
    return await yhubApiAuthUtil.post("/auth/phone/send-otp/", {
      phone,
      country_code: countryCode,
      resource_type: "signup",
    });
  }

  // TODO(backend): Implement POST /auth/signup/verify/ for atomic dual email + phone OTP verification and account creation
  async verifySignupEmailAndPhone(payload: {
    email: string;
    username?: string;
    phone: string;
    countryCode: string;
    emailOtp: string;
    phoneOtp: string;
    name: string;
    password: string;
  }): Promise<LoginResponse> {
    const names = payload.name.trim().split(/\s+/);
    const firstName = names.shift() || "";
    const lastName = names.join(" ");

    const response = await yhubApiAuthUtil.post<LoginResponse>(
      "/auth/signup/verify/?product=ylabs",
      {
        email: payload.email.trim(),
        username: (payload.username || payload.email).trim(),
        first_name: firstName,
        last_name: lastName,
        phone: `${payload.countryCode} ${payload.phone}`,
        email_otp: payload.emailOtp,
        phone_otp: payload.phoneOtp,
        password: payload.password,
        password_confirm: payload.password,
        roles: { ylabs: "student" },
      },
    );

    localStorage.setItem("access", response.access);
    localStorage.setItem("refresh", response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);
    ycodeApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  // Sends 6-digit email reset code for forgot password
  async sendForgotPasswordCode(email: string): Promise<{ status?: string; message: string; cooldown?: number }> {
    return await yhubApiAuthUtil.post("/auth/forgot-password/send-code/", {
      email: email.trim(),
    });
  }

  // Verifies the 6-digit code for password reset and returns signed token
  async verifyForgotPasswordCode(
    email: string,
    code: string,
  ): Promise<{ status?: string; token?: string; uidb64?: string; message?: string }> {
    return await yhubApiAuthUtil.post("/auth/forgot-password/verify-code/", {
      email: email.trim(),
      code: code.trim(),
    });
  }

  // Resets password using verified 6-digit code or reset token, returning logged in session
  async resetPasswordWithCode(
    email: string,
    code: string,
    password: string,
    token?: string,
    uidb64?: string,
  ): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>(
      "/auth/forgot-password/reset-with-code/?product=ylabs",
      {
        email: email.trim(),
        code: code.trim(),
        password,
        token,
        uidb64,
      },
    );

    if (response?.access && response?.refresh) {
      localStorage.setItem("access", response.access);
      localStorage.setItem("refresh", response.refresh);
      restApiAuthUtil.setAuthToken(response.access);
      yhubApiAuthUtil.setAuthToken(response.access);
      ycodeApiAuthUtil.setAuthToken(response.access);
    }

    return response;
  }

  async resetPassword(uidb64: string, token: string, password: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>(
      `/auth/reset-password/${uidb64}/${token}/?product=ylabs`,
      { password },
    );

    if (response?.access && response?.refresh) {
      localStorage.setItem("access", response.access);
      localStorage.setItem("refresh", response.refresh);
      restApiAuthUtil.setAuthToken(response.access);
      yhubApiAuthUtil.setAuthToken(response.access);
      ycodeApiAuthUtil.setAuthToken(response.access);
    }

    return response;
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
