/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_FEEDBACK_EMAIL?: string;
  readonly VITE_FEEDBACK_MIN_NAVIGATIONS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly CACHE_TTL_SECONDS?: string;
  readonly CAKTO_ENFORCE_SUBSCRIPTION?: string;
  readonly DATABASE_URL?: string;
  readonly JWT_ALGORITHM?: string;
  readonly JWT_EXPIRATION_HOURS?: string;
  readonly JWT_SECRET?: string;
  readonly REDIS_URL?: string;
  readonly SUPABASE_KEY?: string;
  readonly SUPABASE_SERVICE_KEY?: string;
  readonly SUPABASE_URL?: string;
  readonly FORCE_HTTP_FALLBACK?: string;
  readonly CAKTO_WEBHOOK_SECRET?: string;
  readonly CAKTO_SUBSCRIPTION_PRODUCT_IDS?: string;
  readonly SMTP_HOST?: string;
  readonly SMTP_PORT?: string;
  readonly SMTP_USER?: string;
  readonly SMTP_PASSWORD?: string;
  readonly SMTP_FROM_EMAIL?: string;
  readonly SMTP_FROM_NAME?: string;
  readonly FRONTEND_URL?: string;
  readonly UPLOAD_TEMP_DIR?: string;
  readonly UPLOAD_INLINE_MAX_BYTES?: string;
  readonly USE_JOBS_PIPELINE?: string;
  readonly S3_BUCKET?: string;
  readonly S3_ENDPOINT?: string;
  readonly S3_ACCESS_KEY?: string;
  readonly S3_SECRET_KEY?: string;
  readonly S3_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
