/**
 * API Configuration
 * Centraliza todas as configurações relacionadas à API
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    AUTH: {
      SIGNUP: '/api/v1/auth/register',
      LOGIN: '/api/v1/auth/login',
    },
  },
  TIMEOUT: 30000, // 30 segundos
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

