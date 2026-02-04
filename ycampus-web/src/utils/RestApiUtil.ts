import { trackApiCall } from '../observability/telemetry';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export class ApiError extends Error {
    status: number;
    details?: Record<string, any>;

    constructor(message: string, status: number, details?: Record<string, any>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

class RestApiUtil {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private buildUrl(endpoint: string, params?: Record<string, string>): string {
        const url = new URL(`${this.baseURL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        return url.toString();
    }

    protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, ...fetchOptions } = options;
        const url = this.buildUrl(endpoint, params);
        const startTime = performance.now();

        const isFormData = fetchOptions.body instanceof FormData;
        const defaultHeaders: Record<string, string> = {};
        if (!isFormData) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const config: RequestInit = {
            headers: {
                ...defaultHeaders,
                ...fetchOptions.headers,
            },
            ...fetchOptions,
        };


        try {
            const response = await fetch(url, config);
            const duration = performance.now() - startTime;
            trackApiCall(fetchOptions.method || 'GET', url, response.status, duration);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                let errorMessage = 'Request failed';

                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
                    errorMessage = errorData.non_field_errors[0];
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else {
                    const firstFieldError = Object.values(errorData).find(value =>
                        Array.isArray(value) && value.length > 0
                    );
                    if (firstFieldError && Array.isArray(firstFieldError)) {
                        errorMessage = firstFieldError[0];
                    }
                }

                throw new ApiError(errorMessage, response.status, errorData);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return response.text() as unknown as T;
        } catch (error) {
            const duration = performance.now() - startTime;
            if (error instanceof ApiError) {
                trackApiCall(fetchOptions.method || 'GET', url, error.status, duration);
                throw error;
            }
            trackApiCall(fetchOptions.method || 'GET', url, 0, duration);
            throw new ApiError('Network error occurred', 0);
        }
    }

    async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', ...options });
    }

    async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: (data instanceof FormData) ? data : (data ? JSON.stringify(data) : undefined),
            ...options,
        });
    }

    async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: (data instanceof FormData) ? data : (data ? JSON.stringify(data) : undefined),
            ...options,
        });
    }

    async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: (data instanceof FormData) ? data : (data ? JSON.stringify(data) : undefined),
            ...options,
        });
    }

    async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', ...options });
    }
}

export { RestApiUtil };
export const restApiUtil = new RestApiUtil(API_BASE_URL);
export default restApiUtil;