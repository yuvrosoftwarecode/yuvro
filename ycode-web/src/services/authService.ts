import type { User } from '../contexts/AuthContext';
import { restApiAuthUtil, yhubApiAuthUtil } from '../utils/RestApiAuthUtil';

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
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/login/?product=ycode', { email, password });

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/register/?product=ycode', data);

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async loginWithGoogle(token: string): Promise<LoginResponse> {
    const response = await yhubApiAuthUtil.post<LoginResponse>('/auth/google/?product=ycode', { token });

    localStorage.setItem('access', response.access);
    localStorage.setItem('refresh', response.refresh);
    restApiAuthUtil.setAuthToken(response.access);
    yhubApiAuthUtil.setAuthToken(response.access);

    return response;
  }

  async getCurrentUser(): Promise<User> {
    return await yhubApiAuthUtil.get<User>('/auth/user/');
  }

  async uploadProfileImage(file: File, field: 'profile_image' | 'cover_image' = 'profile_image'): Promise<User> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('field', field);
    return await yhubApiAuthUtil.post<User>('/auth/profile/upload-image/', formData);
  }

  async removeProfileImage(field: 'profile_image' | 'cover_image' = 'profile_image'): Promise<User> {
    return await yhubApiAuthUtil.post<User>('/auth/profile/remove-image/', { field });
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
    window.location.href = '/login';
  }

  async healthCheck(): Promise<{ status: string }> {
    return await restApiAuthUtil.get<{ status: string }>('/health/');
  }
}

export const authService = new AuthService();
export default authService;