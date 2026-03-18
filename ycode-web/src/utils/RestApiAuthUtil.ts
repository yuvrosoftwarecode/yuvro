import { RestApiUtil, ApiError } from './RestApiUtil';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

class RestApiAuthUtil extends RestApiUtil {
    private token: string | null = null;
    private isRefreshing: boolean = false;
    private refreshSubscribers: ((token: string) => void)[] = [];

    constructor(baseURL: string) {
        super(baseURL);
    }

    private onRefreshed(token: string) {
        this.refreshSubscribers.forEach((cb) => cb(token));
        this.refreshSubscribers = [];
    }

    private addSubscriber(cb: (token: string) => void) {
        this.refreshSubscribers.push(cb);
    }

    setAuthToken(token: string) {
        this.token = token;
    }

    getAuthToken(): string | null {
        return this.token || localStorage.getItem('access');
    }

    clearAuthToken() {
        this.token = null;
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
    }

    isAuthenticated(): boolean {
        return !!this.getAuthToken();
    }

    async forceRefreshToken(): Promise<boolean> {
        console.log('Force refreshing token...');
        return await this.refreshToken();
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private async refreshToken(): Promise<boolean> {
        const refreshToken = localStorage.getItem('refresh');
        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        try {
            console.log('Attempting to refresh token...');
            const response = await super.post<{ access: string; refresh?: string }>('/auth/token/refresh/', { refresh: refreshToken });

            localStorage.setItem('access', response.access);
            if (response.refresh) {
                localStorage.setItem('refresh', response.refresh);
            }
            this.token = response.access;
            console.log('Token refreshed successfully');
            return true;
        } catch (err) {
            console.error('Token refresh failed:', err);
            this.logout();
            return false;
        }
    }

    private logout(): void {
        console.log('Logging out user due to authentication failure');
        this.clearAuthToken();
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        let authHeaders = this.getAuthHeaders() as Record<string, string>;

        if (options.body instanceof FormData) {
            delete authHeaders['Content-Type'];
        }

        let optionsWithAuth = {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers,
            },
        };

        try {
            return await super.request<T>(endpoint, optionsWithAuth);
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                const isAuthEndpoint = endpoint.includes('/auth/login') ||
                    endpoint.includes('/auth/register') ||
                    endpoint.includes('/auth/token/refresh');

                if (isAuthEndpoint) {
                    throw error;
                }

                if (!this.isRefreshing) {
                    this.isRefreshing = true;
                    this.refreshToken().then((success) => {
                        this.isRefreshing = false;
                        if (success && this.token) {
                            this.onRefreshed(this.token);
                        } else {
                            this.refreshSubscribers = [];
                        }
                    });
                }

                return new Promise<T>((resolve) => {
                    this.addSubscriber((newToken) => {
                        const retryHeaders: HeadersInit = {
                            ...options.headers,
                            'Authorization': `Bearer ${newToken}`,
                            ...((authHeaders as Record<string, string>)['Content-Type'] ? { 'Content-Type': (authHeaders as Record<string, string>)['Content-Type'] } : {})
                        };

                        const retryOptionsWithAuth = {
                            ...options,
                            headers: retryHeaders,
                        };
                        resolve(super.request<T>(endpoint, retryOptionsWithAuth));
                    });
                });
            }
            throw error;
        }
    }
}

export const restApiAuthUtil = new RestApiAuthUtil(API_BASE_URL);
export default restApiAuthUtil;