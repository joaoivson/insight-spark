/**
 * Application Configuration
 * Configurações gerais da aplicação
 */

export const APP_CONFIG = {
  NAME: 'MarketDash',
  VERSION: '1.0.0',
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    DASHBOARD: '/dashboard',
    DASHBOARD_UPLOAD: '/dashboard/upload',
    DASHBOARD_REPORTS: '/dashboard/reports',
    DASHBOARD_MODULES: '/dashboard/modules',
    DASHBOARD_SETTINGS: '/dashboard/settings',
  },
  STORAGE_KEYS: {
    USER: 'user',
    TOKEN: 'token',
    THEME: 'theme',
  },
} as const;

