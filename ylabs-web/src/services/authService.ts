import type { User } from '../lib/auth';
import { restApiAuthUtil, yhubApiAuthUtil } from '../utils/RestApiAuthUtil';
import { restApiUtil } from '../utils/RestApiUtil';

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
}

class AuthService {
  setAuthToken(token: string): void {
    restApiAuthUtil.setAuthToken(token);
    yhubApiAuthUtil.setAuthToken(token);
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
    const token = localStorage.getItem('access');
    if (token) {
      restApiAuthUtil.setAuthToken(token);
      yhubApiAuthUtil.setAuthToken(token);
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/login/?product=ylabs', { email, password });

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/register/?product=ylabs', data);

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async loginWithGoogle(token: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/google/?product=ylabs', { token });

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async getCurrentUser(): Promise<User> {
    return await restApiAuthUtil.get<User>('/auth/user/');
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    return await restApiAuthUtil.put<User>('/auth/user/', userData);
  }

  async logoutUser(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh');
    if (refreshToken) {
      yhubApiAuthUtil.post('/auth/logout/', { refresh: refreshToken }).catch(error => {
        console.warn('Logout error:', error);
      });
    }
    restApiAuthUtil.clearAuthToken();
    yhubApiAuthUtil.clearAuthToken();
    window.location.href = '/auth?tab=signin';
  }

  async healthCheck(): Promise<{ status: string }> {
    return await restApiAuthUtil.get<{ status: string }>('/health/');
  }

  async forgotPassword(email: string): Promise<any> {
    return await yhubApiAuthUtil.post('/auth/forgot-password/', { email });
  }

  async resetPassword(uidb64: string, token: string, password: string): Promise<any> {
    return await yhubApiAuthUtil.post(`/auth/reset-password/${uidb64}/${token}/`, { password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return await yhubApiAuthUtil.post('/auth/change-password/', {
      password: newPassword,
    });
  }
}

export const authService = new AuthService();
export default authService;