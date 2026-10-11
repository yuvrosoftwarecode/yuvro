const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  details?: Record<string, any>;

  constructor(message: string, status: number, details?: Record<string, any>) {
    super(message);
    this.name = "ApiError";
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
    const cleanBaseUrl = this.baseURL.endsWith("/") ? this.baseURL.slice(0, -1) : this.baseURL;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = new URL(`${cleanBaseUrl}${cleanEndpoint}`);
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
      defaultHeaders["Content-Type"] = "application/json";

      // Inject minutes_solved dynamically for lab submissions (only on final submit, as integer)
      if (
        typeof fetchOptions.body === "string" &&
        (endpoint.includes("/lab/submissions/") || endpoint.includes("/skill_evaluation/lab-submissions/"))
      ) {
        try {
          const bodyObj = JSON.parse(fetchOptions.body);
          const statusVal = bodyObj.ticket_status ?? bodyObj.status ?? "";
          const isFinalSubmit = statusVal === "done" || statusVal === "in_review";
          if (isFinalSubmit && (window as any).__labSessionStartTime && bodyObj.minutes_solved === undefined) {
            const sessionSeconds = Math.round((Date.now() - (window as any).__labSessionStartTime) / 1000);
            // Backend expects an integer (whole minutes), minimum 1
            bodyObj.minutes_solved = Math.max(1, Math.round(sessionSeconds / 60));
            bodyObj.seconds_solved = sessionSeconds;
            fetchOptions.body = JSON.stringify(bodyObj);
          }
        } catch (e) {
          // Ignore parse error
        }
      }
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...fetchOptions.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const duration = performance.now() - startTime;

      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          if (text && text.trim()) {
            errorData = JSON.parse(text);
          }
        } catch (e) {
          console.warn("Failed to parse error response as JSON:", e);
          errorData = {};
        }

        let errorMessage = "Request failed";

        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors[0];
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        } else {
          const firstFieldError = Object.values(errorData).find(
            (value) => (Array.isArray(value) && value.length > 0) || typeof value === "string"
          );
          if (firstFieldError) {
            errorMessage = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError;
          } else if (Object.keys(errorData).length > 0) {
            errorMessage = JSON.stringify(errorData);
          }
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        if (text && text.trim()) {
          return JSON.parse(text);
        }
        return {} as T;
      }

      return response.text() as unknown as T;
    } catch (error) {
      const duration = performance.now() - startTime;
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError("Network error occurred", 0);
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

export { RestApiUtil };
export const restApiUtil = new RestApiUtil(API_BASE_URL);
export const yhubApiUtil = new RestApiUtil(
  import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || API_BASE_URL,
);
export default restApiUtil;
