/**
 * API Configuration
 * Centraliza todas as configurações relacionadas à API
 */

// Função para detectar e corrigir URL da API
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Se não houver URL configurada, usar localhost
  if (!envUrl) {
    return 'http://localhost:8000';
  }
  
  // Se a URL começar com https mas estivermos em um ambiente que pode ter problemas de SSL,
  // tentar usar HTTP como fallback
  if (envUrl.startsWith('https://')) {
    // Verificar se estamos em homologação (hml.marketdash.com.br)
    if (typeof window !== 'undefined' && window.location.hostname.includes('hml.marketdash.com.br')) {
      // Usar HTTP para homologação se o certificado SSL não estiver funcionando
      return envUrl.replace('https://api.hml.marketdash.com.br', 'http://api.hml.marketdash.com.br');
    }
    // Verificar se estamos em produção e também pode ter problemas de SSL
    if (typeof window !== 'undefined' && window.location.hostname.includes('marketdash.com.br') && !window.location.hostname.includes('hml')) {
      // Manter HTTPS para produção, mas podemos adicionar fallback se necessário
      return envUrl;
    }
  }
  
  return envUrl;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
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

