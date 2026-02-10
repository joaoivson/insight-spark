/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_FEEDBACK_EMAIL?: string;
  readonly VITE_FEEDBACK_MIN_NAVIGATIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
