/// <reference types="vite/client" />

declare module "@feature-flags" {
  const value: {
    payment_provider: "cakto" | "kiwify";
  };
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_FEEDBACK_EMAIL?: string;
  readonly VITE_FEEDBACK_MIN_NAVIGATIONS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_CACHE_TTL_SECONDS?: string;
  readonly VITE_CAKTO_ENFORCE_SUBSCRIPTION?: string;
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_JWT_ALGORITHM?: string;
  readonly VITE_JWT_EXPIRATION_HOURS?: string;
  readonly VITE_JWT_SECRET?: string;
  readonly VITE_REDIS_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  readonly VITE_SUPABASE_SERVICE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_FORCE_HTTP_FALLBACK?: string;
  readonly VITE_CAKTO_WEBHOOK_SECRET?: string;
  readonly VITE_CAKTO_SUBSCRIPTION_PRODUCT_IDS?: string;
  readonly VITE_SMTP_HOST?: string;
  readonly VITE_SMTP_PORT?: string;
  readonly VITE_SMTP_USER?: string;
  readonly VITE_SMTP_PASSWORD?: string;
  readonly VITE_SMTP_FROM_EMAIL?: string;
  readonly VITE_SMTP_FROM_NAME?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_UPLOAD_TEMP_DIR?: string;
  readonly VITE_UPLOAD_INLINE_MAX_BYTES?: string;
  readonly VITE_USE_JOBS_PIPELINE?: string;
  readonly VITE_S3_BUCKET?: string;
  readonly VITE_S3_ENDPOINT?: string;
  readonly VITE_S3_ACCESS_KEY?: string;
  readonly VITE_S3_SECRET_KEY?: string;
  readonly VITE_S3_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
