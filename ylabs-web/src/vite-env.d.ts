/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA4_MEASUREMENT_ID?: string;
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_BACKEND_API_BASE_URL?: string;
  readonly VITE_YHUB_BACKEND_API_BASE_URL?: string;
  readonly VITE_YCODE_BACKEND_API_BASE_URL?: string;
  readonly VITE_CODE_EXECUTOR_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PUBLIC_PROFILE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
